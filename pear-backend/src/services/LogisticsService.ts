import type { MachinePurchasingService } from "./MachinePurchasingService.js";
import { receivePhone } from "../externalAPIs/SimulationAPIs.js";
import type { ReceivePhoneRequest } from "../types/extenalApis.js";
import { pool } from "../config/database.js";

export class LogisticsService {
  constructor(private machinePurchasingService: MachinePurchasingService) {}

  async confirmGoodsDelivered(delivery_reference: string): Promise<void> {
    const isMachineDelivery = await this.isMachineDeliveryReference(delivery_reference);

    if (isMachineDelivery) {
      const success = await this.machinePurchasingService.confirmMachineDelivery(delivery_reference);
      if (!success) {
        throw new Error(`Failed to confirm machine delivery for reference ${delivery_reference}`);
      }
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const deliveryResult = await client.query(
        `
        SELECT bd.delivery_reference, pp.part_id, pp.quantity
        FROM bulk_deliveries bd
        JOIN parts_purchases pp ON bd.parts_purchase_id = pp.parts_purchase_id
        WHERE bd.delivery_reference = $1
        `,
        [delivery_reference]
      );

      if (deliveryResult.rowCount === 0) {
        throw new Error(`No bulk delivery found for reference ${delivery_reference}`);
      }

      const { part_id, quantity } = deliveryResult.rows[0] as { part_id: number; quantity: number };

      await client.query(
        `
        UPDATE bulk_deliveries AS bd
        SET units_received = pp.quantity
        FROM parts_purchases pp
        WHERE bd.delivery_reference = $1
          AND bd.parts_purchase_id = pp.parts_purchase_id
        `,
        [delivery_reference]
      );

      const invUpdate = await client.query(
        `
        UPDATE inventory
        SET quantity_available = quantity_available + $2
        WHERE part_id = $1
        `,
        [part_id, quantity]
      );

      if (invUpdate.rowCount !== 1) {
        throw new Error(
          `Inventory update failed for part_id=${part_id}; no matching inventory row found`
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error confirming bulk goods delivered:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmGoodsCollection(delivery_reference: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const deliveryResult = await client.query(
        `SELECT * FROM consumer_deliveries WHERE delivery_reference = $1`,
        [delivery_reference]
      );
      if (deliveryResult.rowCount === 0) {
        throw new Error(`No consumer delivery found for reference ${delivery_reference}`);
      }
      const consumerDelivery = deliveryResult.rows[0];

      const orderId = consumerDelivery.order_id as number;
      const orderItemsResult = await client.query(
        `SELECT phone_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      const orderItems: Array<{ phone_id: number; quantity: number }> = orderItemsResult.rows;

      const totalCollected = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      await client.query(
        `
        UPDATE consumer_deliveries
        SET units_collected = $1
        WHERE delivery_reference = $2
        `,
        [totalCollected, delivery_reference]
      );

      for (const item of orderItems) {
        const upd = await client.query(
          `
          UPDATE stock
          SET quantity_reserved = quantity_reserved - $1
          WHERE phone_id = $2 AND quantity_reserved >= $1
          `,
          [item.quantity, item.phone_id]
        );

        if (upd.rowCount !== 1) {
          throw new Error(
            `Reserved stock underflow or missing stock row for phone_id=${item.phone_id} (qty=${item.quantity})`
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error confirming goods collection:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async isMachineDeliveryReference(deliveryReference: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 1 FROM machine_deliveries WHERE delivery_reference = $1`,
        [deliveryReference]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking machine delivery reference:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  getConsumerPendingDeliveries = async () => {
    const query = `
      SELECT 
        p.model,
        SUM(oi.quantity)::INTEGER AS units_pending,
        SUM(cd.cost) AS cost
      FROM consumer_deliveries cd
      JOIN orders o ON o.order_id = cd.order_id
      JOIN order_items oi ON oi.order_id = o.order_id
      JOIN phones p ON p.phone_id = oi.phone_id
      WHERE cd.units_collected = 0
      GROUP BY p.model
      ORDER BY p.model;
    `;
    const result = await pool.query(query);
    return result.rows;
  };

  getBulkDeliveries = async () => {
    const query = `
      SELECT 
        p.name AS part,
        SUM(pp.quantity) AS quantity,
        SUM(bd.cost) AS cost
      FROM bulk_deliveries bd
      JOIN parts_purchases pp ON bd.parts_purchase_id = pp.parts_purchase_id
      JOIN parts p ON pp.part_id = p.part_id
      GROUP BY p.name
      ORDER BY p.name;
    `;
    const result = await pool.query(query);
    return result.rows;
  };

  getMachineDeliveries = async () => {
    return await this.machinePurchasingService.getPendingMachineDeliveries();
  };

  getMachineDeliveryStats = async () => {
    return await this.machinePurchasingService.getMachineDeliveryStats();
  };

  public async notifyDelivery(delivery_reference: string): Promise<void> {
    const cdRes = await pool.query(
      `
      SELECT account_number, delivery_reference, order_id
      FROM consumer_deliveries
      WHERE delivery_reference = $1
      `,
      [delivery_reference]
    );
    if (cdRes.rowCount === 0) {
      throw new Error("Delivery reference not found");
    }
    const row = cdRes.rows[0] as { account_number: string; delivery_reference: string; order_id: number };

    const itemsRes = await pool.query(
      `
      SELECT p.model
      FROM order_items oi
      JOIN phones p ON oi.phone_id = p.phone_id
      WHERE oi.order_id = $1
      `,
      [row.order_id]
    );
    if (itemsRes.rowCount === 0) {
      throw new Error("Order not found for delivery");
    }

    for (const item of itemsRes.rows as Array<{ model: string }>) {
      const request: ReceivePhoneRequest = {
        accountNumber: row.account_number,
        phoneName: item.model,
        id: row.delivery_reference,
        description: `Phone delivery for order ${row.order_id}`,
      };

      await receivePhone(request);
    }
  }
}

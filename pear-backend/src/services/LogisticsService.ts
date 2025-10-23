
import type { MachinePurchasingService } from "./MachinePurchasingService.js"
import type { DeliveryConfirmation } from "../types/publicApi.js";
import { receivePhone } from "../externalAPIs/SimulationAPIs.js";
import type { ReceivePhoneRequest } from "../types/extenalApis.js";
import {pool} from "../config/database.js";

export class LogisticsService {

  constructor(private machinePurchasingService: MachinePurchasingService) {} 

  async confirmGoodsDelivered(delivery_reference: string): Promise<void> {

    const isMachineDelivery = await this.isMachineDeliveryReference(delivery_reference)

    if (isMachineDelivery) {
      const success = await this.machinePurchasingService.confirmMachineDelivery(delivery_reference)

      if (!success)  {
        throw new Error(`Failed to confirm machine delivery for reference ${delivery_reference}`)
      }
    } else {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Lookup bulk delivery, join to parts_purchases and parts to get part_id
        const deliveryResult = await client.query(`
          SELECT bd.*, pp.part_id
          FROM bulk_deliveries bd
          JOIN parts_purchases pp ON bd.parts_purchase_id = pp.parts_purchase_id
          WHERE bd.delivery_reference = $1
        `, [delivery_reference]);

        if (deliveryResult.rowCount === 0) {
          throw new Error(`No bulk delivery found for reference ${delivery_reference}`);
        }
        const bulkDelivery = deliveryResult.rows[0];

        // 2. Update units_received in bulk_deliveries (assume all received)
        await client.query(`
          UPDATE bulk_deliveries
          SET units_received = pp.quantity -- or another field if tracking how many units were ordered
          FROM parts_purchases pp
          WHERE bulk_deliveries.delivery_reference = $1
            AND bulk_deliveries.parts_purchase_id = pp.parts_purchase_id
        `, [delivery_reference]);

        // 3. Update inventory for that part_id
        await client.query(`
          UPDATE inventory
          SET quantity_available = quantity_available + pp.quantity
          FROM parts_purchases pp, bulk_deliveries bd
          WHERE inventory.part_id = pp.part_id
            AND pp.parts_purchase_id = bd.parts_purchase_id
            AND bd.delivery_reference = $1
        `, [delivery_reference]);

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error confirming bulk goods delivered:", error);
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async confirmGoodsCollection(delivery_reference: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Find consumer_delivery by delivery_reference
      const deliveryResult = await client.query(
        `SELECT * FROM consumer_deliveries WHERE delivery_reference = $1`,
        [delivery_reference]
      );
      if (deliveryResult.rowCount === 0) {
        throw new Error(`No consumer delivery found for reference ${delivery_reference}`);
      }
      const consumerDelivery = deliveryResult.rows[0];

      // 2. Get the order and all order items for this delivery
      const orderId = consumerDelivery.order_id;
      const orderItemsResult = await client.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      const orderItems = orderItemsResult.rows;
     
      // 3. Update units_collected to total quantity collected
      // (Assuming it's the sum of all items in the order)
      const totalCollected = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      
      await client.query(
        `UPDATE consumer_deliveries
        SET units_collected = $1
        WHERE delivery_reference = $2`,
        [totalCollected, delivery_reference]
      );
      
      // 4. Update phone stock for each item in the order
      for (const item of orderItems) {
        await client.query(
          `UPDATE stock
          SET quantity_reserved = quantity_reserved - $1
          WHERE phone_id = $2`,
          [item.quantity, item.phone_id]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error confirming goods collection:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async isMachineDeliveryReference(deliveryReference: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      const result = await client.query(`SELECT 1 FROM machine_deliveries WHERE delivery_reference = $1`, [
        deliveryReference,
      ])
      return result.rows.length > 0
    } catch (error) {
      console.error("Error checking machine delivery reference:", error)
      return false
    } finally {
      client.release()
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
    `
    const result = await pool.query(query)
    return result.rows
  }

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
    `
    const result = await pool.query(query)
    return result.rows
  }

  getMachineDeliveries = async () => {
    return await this.machinePurchasingService.getPendingMachineDeliveries()
  }

  getMachineDeliveryStats = async () => {
    return await this.machinePurchasingService.getMachineDeliveryStats()
  };

  public async notifyDelivery(delivery_reference: string): Promise<void> {

    const result = await pool.query(
      `SELECT account_number, delivery_reference, order_id 
       FROM consumer_deliveries
       WHERE delivery_reference = $1`,
      [delivery_reference]
    );
    if (result.rowCount === 0) {
      throw new Error("Delivery reference not found");
    }
    const row = result.rows[0];

    const orderResult = await pool.query(
      `SELECT p.model
        FROM order_items oi
        JOIN phones p ON oi.phone_id = p.phone_id
        WHERE oi.order_id = $1`,
      [row.order_id]
    );
    if (orderResult.rowCount === 0) {
      throw new Error("Order not found for delivery");
    }
    const order = orderResult.rows[0];

    const request: ReceivePhoneRequest = {
      accountNumber: row.account_number,
      phoneName: order.model,
      id: row.delivery_reference,
      description: `${row.order_id}`,
    };

    await receivePhone(request);
  }
}


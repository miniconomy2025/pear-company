import type { DeliveryConfirmation } from "../types/publicApi.js";
import {pool} from "../config/database.js";
import { createPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/COmmercialBankAPIs.js";

export class LogisticsService {
  constructor() {}

  async confirmGoodsDelivered(delivery: DeliveryConfirmation): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query<{ parts_purchase_id: number }>(
        `SELECT parts_purchase_id
           FROM bulk_deliveries
          WHERE delivery_reference = $1`,
        [delivery.delivery_reference]
      );
      if (res.rowCount === 0) {
        throw new Error(`Bulk delivery ${delivery.delivery_reference} not found.`);
      }
      const partsPurchaseId = res.rows[0].parts_purchase_id;

      await client.query(
        `UPDATE bulk_deliveries
            SET status = (
              SELECT status_id FROM status WHERE description = 'delivered'
            )
          WHERE delivery_reference = $1`,
        [delivery.delivery_reference]
      );

      await client.query(
        `
        UPDATE inventory i
           SET quantity_available = i.quantity_available - pi.quantity
          FROM parts_purchases_items pi
         WHERE pi.parts_purchase_id = $1
           AND i.part_id = (
             SELECT ps.part_id
               FROM parts_supplier ps
              WHERE ps.parts_supplier_id = pi.part_supplier_id
           )
        `,
        [partsPurchaseId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async confirmGoodsCollection(collection: DeliveryConfirmation): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query<{ order_id: number }>(
        `SELECT order_id
           FROM consumer_deliveries
          WHERE delivery_reference = $1`,
        [collection.delivery_reference]
      );
      if (res.rowCount === 0) {
        throw new Error(`Consumer delivery ${collection.delivery_reference} not found.`);
      }
      const orderId = res.rows[0].order_id;

      await client.query(
        `UPDATE consumer_deliveries
            SET status = (
              SELECT status_id FROM status WHERE description = 'collected'
            )
          WHERE delivery_reference = $1`,
        [collection.delivery_reference]
      );

      await client.query(
        `
        UPDATE stock s
           SET quantity_reserved = s.quantity_reserved - oi.quantity
          FROM order_items oi
         WHERE oi.order_id = $1
           AND s.phone_id = oi.phone_id
        `,
        [orderId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deliverGoods(orderId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const quantityRes = await pool.query<{ total: number }>(
        `
        SELECT COALESCE(SUM(quantity), 0) AS total
          FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

      const pickupRes = await createPickup({
        quantity: quantityRes.rows[0].total,
        pickup_from: "pear-company",
        delivery_to: "customer",
      });

      const { rows: statusRows } = await client.query<{ status_id: number }>(
        `SELECT status_id
          FROM status
          WHERE description = 'reserved'`
      );
      if (statusRows.length === 0) {
        throw new Error(`Status 'reserved' not defined in status table.`);
      }
      const pendingStatusId = statusRows[0].status_id;

      await client.query(
        `
        INSERT INTO consumer_deliveries
          (order_id, delivery_reference, cost, status, account_id)
        VALUES
          ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          pickupRes?.refernceno,
          pickupRes?.amount,      
          pendingStatusId,
          "unknown"
        ]
      );

      console.log(`Created consumer_delivery with reference ${pickupRes}`);

      await createTransaction({
        to_account_number: "unknown", //TODO: account number
        amount: pickupRes?.amount || 0,
        description: `Payment for delivery #${ pickupRes?.refernceno}`
      });
      console.log(`Payment for delivery #${ pickupRes?.refernceno}`);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}


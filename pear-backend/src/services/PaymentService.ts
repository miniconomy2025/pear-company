import type { PaymentNotification } from "../types/publicApi.js"
import {pool} from "../config/database.js";
import { createPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";

export class PaymentService {
  async processPayment(payment: PaymentNotification): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lookup = await client.query<{
        price: string;
        status_desc: string;
      }>(
        `
        SELECT
          o.price::text     AS price,
          s.description     AS status_desc
        FROM orders o
        JOIN status s
          ON o.status = s.status_id
        WHERE o.order_id = $1
        FOR UPDATE
        `,
        [payment.reference]
      );

      if (lookup.rowCount === 0) {
        throw new Error(`Order ${payment.reference} not found.`);
      }

      const { price, status_desc } = lookup.rows[0];
      const orderTotal = parseFloat(price);

      if (status_desc !== "Pending") {
        throw new Error(`Order ${payment.reference} is not in 'Pending' status.`);
      }

      if (Math.abs(orderTotal - payment.amount) > 0.001) {
        throw new Error(
          `Payment amount ${payment.amount} does not match order total ${orderTotal}.`
        );
      }

      await client.query(
        `
        UPDATE orders
           SET status = (
             SELECT status_id
               FROM status
              WHERE description = 'Delivered'
           )
         WHERE order_id = $1
      `,
        [payment.reference]
      );

      await this.deliverGoods(payment.reference);

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
      if (!pickupRes) {
        throw new Error(`Status 'Processing' not defined in status table.`);
      }

      const { rows: statusRows } = await client.query<{ status_id: number }>(
        `SELECT status_id
          FROM status
          WHERE description = 'Processing'`
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
          pickupRes.refernceno,
          pickupRes.amount,      
          pendingStatusId,
          pickupRes.accountNumber, 
        ]
      );

      console.log(`Created consumer_delivery with reference ${pickupRes}`);

      await createTransaction({
        to_account_number: pickupRes.accountNumber,
        to_bank_name: "commercial-bank",
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

  async getAccountNumber(): Promise<string> {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1`,
      ['bank_account_number']
    );
    if (result.rows.length === 0) {
      throw new Error('Account number not configured in system_settings.');
    }
    return result.rows[0].value;
  }
}

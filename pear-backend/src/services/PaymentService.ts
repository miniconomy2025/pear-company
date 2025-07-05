import type { PaymentNotification } from "../types/publicApi.js"
import pool from "../config/db.js";

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

      if (status_desc !== "reserved") {
        throw new Error(`Order ${payment.reference} is not in 'reserved' status.`);
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
              WHERE description = 'paid'
           )
         WHERE order_id = $1
      `,
        [payment.reference]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    // TODO: Create consumer delivery record
  }
}

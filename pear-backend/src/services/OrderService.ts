// src/services/OrderService.ts
import type { PublicOrderRequest, PublicOrderResponse, OrderReservation } from "../types/publicApi.js";
import { pool } from "../config/database.js";
// import { StockService } from "./StockService.js"; // no longer used for in-tx stock ops
import { PaymentService } from "./PaymentService.js";
import { createPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";
import { createRetailTransaction } from "../externalAPIs/RetailBankAPIs.js";

const paymentService = new PaymentService();

export class OrderService {
  async createOrder(orderRequest: PublicOrderRequest): Promise<PublicOrderResponse> {
    if (!orderRequest.items || orderRequest.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }
    for (const item of orderRequest.items) {
      if (!item.model || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item: phoneName and positive quantity required");
      }
    }

    const client = await pool.connect();
    let orderId: number | null = null;
    try {
      await client.query("BEGIN");

      // Use a consistent status vocabulary
      const statusRes = await client.query<{ status_id: number }>(
        `SELECT status_id FROM status WHERE description = 'Pending'`
      );
      if (statusRes.rowCount === 0) throw new Error(`"Pending" status not found.`);
      const pendingStatusId = statusRes.rows[0].status_id;

      // Reserve stock atomically & compute total
      let totalPrice = 0;
      for (const { model, quantity } of orderRequest.items) {
        // Fetch phone id & price
        const ph = await client.query<{ phone_id: number; price: string }>(
          `SELECT phone_id, price::text FROM phones WHERE model = $1`,
          [model]
        );
        if (ph.rowCount === 0) {
          throw new Error(`Phone not found for phone name=${model}`);
        }
        const phoneId = ph.rows[0].phone_id;
        const unitPrice = parseFloat(ph.rows[0].price);

        // **Atomic reservation**: only succeed if enough available
        const upd = await client.query(
          `
          UPDATE stock
          SET quantity_available = quantity_available - $2,
              quantity_reserved  = quantity_reserved  + $2
          WHERE phone_id = $1 AND quantity_available >= $2
          RETURNING phone_id
          `,
          [phoneId, quantity]
        );
        if (upd.rowCount !== 1) {
          throw new Error(`Not enough stock for phone ${model}: requested ${quantity}.`);
        }

        totalPrice += unitPrice * quantity;
      }

      // Create order (Pending) and items
      const orderRes = await client.query<{ order_id: number }>(
        `INSERT INTO orders(price, status, created_at)
         VALUES ($1, $2, NOW())
         RETURNING order_id`,
        [totalPrice, pendingStatusId]
      );
      orderId = orderRes.rows[0].order_id;

      for (const { model, quantity } of orderRequest.items) {
        const ph = await client.query<{ phone_id: number }>(
          `SELECT phone_id FROM phones WHERE model = $1`,
          [model]
        );
        await client.query(
          `INSERT INTO order_items(order_id, phone_id, quantity) VALUES ($1, $2, $3)`,
          [orderId, ph.rows[0].phone_id, quantity]
        );
      }

      // Finish DB work fast; external calls come after COMMIT. :contentReference[oaicite:1]{index=1}
      await client.query("COMMIT");

      // External payment (cannot be part of DB tx)
      const yourAccountNumber = await paymentService.getAccountNumber();
      const retailTransaction = await createRetailTransaction({
        from: yourAccountNumber,
        to: orderRequest.accountNumber,
        amountCents: totalPrice,
        reference: orderId,
      });
      if (!retailTransaction) {
        // Compensation: release reserved stock & remove order
        await this.compensatePaymentFailure(orderId);
        throw new Error(`Payment for order ${orderId} failed`);
      }

      // Arrange pickup + pay delivery provider
      await this.deliverGoods(orderId);

      return { order_id: orderId, price: totalPrice, accountNumber: yourAccountNumber };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Compensation routine if retail payment fails after order creation:
   * - restore reserved stock
   * - delete order and order_items
   */
  private async compensatePaymentFailure(orderId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const items = await client.query<{ phone_id: number; quantity: number }>(
        `SELECT phone_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      for (const { phone_id, quantity } of items.rows) {
        await client.query(
          `
          UPDATE stock
          SET quantity_reserved  = quantity_reserved  - $2,
              quantity_available = quantity_available + $2
          WHERE phone_id = $1 AND quantity_reserved >= $2
          `,
          [phone_id, quantity]
        );
      }

      await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
      await client.query(`DELETE FROM orders WHERE order_id = $1`, [orderId]);

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Compensation for payment failure failed; manual intervention may be required.", e);
    } finally {
      client.release();
    }
  }

  async deliverGoods(orderId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const quantityRes = await client.query<{ total: string }>(
        `
        SELECT COALESCE(SUM(quantity), 0)::text AS total
          FROM order_items
         WHERE order_id = $1
        `,
        [orderId]
      );

      const modelRes = await client.query<{ model: string }>(
        `
        SELECT p.model
          FROM order_items oi
          JOIN phones p ON oi.phone_id = p.phone_id
         WHERE oi.order_id = $1
         LIMIT 1
        `,
        [orderId]
      );

      const totalQty = parseInt(quantityRes.rows[0].total, 10) || 0;
      if (modelRes.rowCount === 0 || totalQty <= 0) {
        throw new Error(`Order ${orderId} has no items to deliver`);
      }

      // Create pickup with the logistics provider (external)
      const pickupRes = await createPickup({
        companyName: "pear",
        quantity: totalQty,
        recipient: "THoH",
        modelName: modelRes.rows[0].model,
      });
      if (!pickupRes) {
        throw new Error("Failed to create pickup request (logistics service error).");
      }

      // Lookup 'Processing' status
      const statusRows = await client.query<{ status_id: number }>(
        `SELECT status_id FROM status WHERE description = 'Processing'`
      );
      if (statusRows.rowCount === 0) {
        throw new Error(`Status 'Processing' not found in DB`);
      }
      const processingStatusId = statusRows.rows[0].status_id;

      // Record consumer delivery
      const deliveryRef =
        (pickupRes as any).refernceno ?? (pickupRes as any).referenceNo ?? (pickupRes as any).reference ?? "";
      if (!deliveryRef) {
        throw new Error("Pickup response missing delivery reference.");
      }

      await client.query(
        `
        INSERT INTO consumer_deliveries
          (order_id, delivery_reference, cost, status, account_id)
        VALUES
          ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          deliveryRef,
          (pickupRes as any).amount ?? 0,
          processingStatusId,
          (pickupRes as any).accountNumber ?? null,
        ]
      );

      // Pay the delivery provider and verify success
      const deliveryTxn = await createTransaction({
        to_account_number: (pickupRes as any).accountNumber,
        to_bank_name: "commercial-bank",
        amount: (pickupRes as any).amount || 0,
        description: `Payment for delivery #${deliveryRef}`,
      });
      if (!deliveryTxn || !(deliveryTxn as any).success) {
        throw new Error(`Delivery provider payment failed for reference ${deliveryRef}`);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getOrderReservation(orderId: number): Promise<OrderReservation | null> {
    const client = await pool.connect();
    try {
      const orderRes = await client.query<{
        order_id: number;
        price: string;
        status: string;
        created_at: Date;
      }>(
        `
        SELECT
          o.order_id,
          o.price::text    AS price,
          s.description    AS status,
          o.created_at
        FROM orders o
        JOIN status s ON o.status = s.status_id
        WHERE o.order_id = $1
        `,
        [orderId]
      );

      if (orderRes.rowCount === 0) return null;

      const { order_id, price, created_at } = orderRes.rows[0];

      const itemsRes = await client.query<{ phone_id: number; quantity: number }>(
        `SELECT phone_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      const expires_at = new Date(created_at.getTime() + 24 * 60 * 60 * 1000);

      return {
        order_id,
        total_price: parseFloat(price),
        expires_at,
        items: itemsRes.rows,
      };
    } finally {
      client.release();
    }
  }

  async cancelOrder(orderId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lookup = await client.query<{ status_desc: string }>(
        `
        SELECT s.description AS status_desc
          FROM orders o
          JOIN status s ON o.status = s.status_id
         WHERE o.order_id = $1
        `,
        [orderId]
      );
      if (lookup.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      // Only cancel if still 'Pending'
      if (lookup.rows[0].status_desc !== "Pending") {
        await client.query("ROLLBACK");
        return false;
      }

      const itemsRes = await client.query<{ phone_id: number; quantity: number }>(
        `SELECT phone_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      // Release reserved stock atomically
      for (const { phone_id, quantity } of itemsRes.rows) {
        const upd = await client.query(
          `
          UPDATE stock
          SET quantity_reserved  = quantity_reserved  - $2,
              quantity_available = quantity_available + $2
          WHERE phone_id = $1 AND quantity_reserved >= $2
          `,
          [phone_id, quantity]
        );
        if (upd.rowCount !== 1) {
          await client.query("ROLLBACK");
          return false;
        }
      }

      // Option: mark as Cancelled (if you have that status). For now, revert to Pending (no reservation).
      await client.query(
        `
        UPDATE orders
           SET status = (
             SELECT status_id FROM status WHERE description = 'Pending'
           )
         WHERE order_id = $1
        `,
        [orderId]
      );

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async cleanupExpiredReservations(currentSimulatedDate: Date): Promise<void> {
    const client = await pool.connect();
    try {
      const cutoffTime = new Date(currentSimulatedDate.getTime() - 24 * 60 * 60 * 1000);

      const res = await client.query<{ order_id: number }>(
        `
        SELECT o.order_id
          FROM orders o
          JOIN status s ON o.status = s.status_id
         WHERE s.description = 'Pending'
           AND o.created_at < $1
        `,
        [cutoffTime]
      );

      for (const { order_id } of res.rows) {
        await this.cancelOrder(order_id);
      }
    } finally {
      client.release();
    }
  }

  getAllOrders = async (from: string, to: string) => {
    const query = `
      SELECT
        p.model,
        DATE(o.created_at) AS date,
        SUM(oi.quantity)::INTEGER AS units_sold,
        SUM(oi.quantity * p.price)::INTEGER AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN phones p ON p.phone_id = oi.phone_id
      WHERE o.status IN (
        SELECT s.status_id FROM status s WHERE description IN ('Completed', 'Shipped', 'Delivered')
      )
        AND o.created_at BETWEEN $1 AND $2
      GROUP BY p.model, DATE(o.created_at)
      ORDER BY date
    `;
    const result = await pool.query(query, [from, to]);
    return result.rows;
  };
}

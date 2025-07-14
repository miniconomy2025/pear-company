import type { PublicOrderRequest, PublicOrderResponse, OrderReservation } from "../types/publicApi.js";
import {pool} from "../config/database.js";
import { StockService } from "./StockService.js";
import { PaymentService } from "./PaymentService.js";
import { createPickup } from "../externalAPIs/ConsumerLogisticsAPIs.js";
import { createTransaction } from "../externalAPIs/CommercialBankAPIs.js";
import { createRetailTransaction } from "../externalAPIs/RetailBankAPIs.js";

const stockService = new StockService();
const paymentService = new PaymentService();

export class OrderService {
  async createOrder(orderRequest: PublicOrderRequest): Promise<PublicOrderResponse> {

    if (!orderRequest.items || orderRequest.items.length === 0) {
      throw new Error("Order must contain at least one item")
    }

    for (const item of orderRequest.items) {
      if (!item.model || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item: phoneName and positive quantity required")
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const statusRes = await client.query<{ status_id: number }>(
        `SELECT status_id 
           FROM status 
          WHERE description = 'Pending'`
      );
      if (statusRes.rowCount === 0) throw new Error(`"Pending" status not found.`);
      const reservedStatusId = statusRes.rows[0].status_id;

      let totalPrice = 0;
      for (const { model, quantity } of orderRequest.items) {

        const result = await client.query<{ phone_id: number, price: string }>(
          `SELECT phone_id, 
            price::text 
            FROM phones
            WHERE model = $1
          `,
          [model]
        );
        if (result.rowCount === 0) {
          throw new Error(`Phone not found for phone name=${model}`);
        }
        const phone_id = result.rows[0].phone_id;

        const isAvailable = await stockService.checkAvailability(phone_id, quantity);
        if (!isAvailable) {
          throw new Error(
            `Not enough stock for phone ${model}: requested ${quantity}.`
          );
        }

        await stockService.reserveStock(phone_id, quantity);

        const unitPrice = parseFloat(result.rows[0].price);
        totalPrice += unitPrice * quantity;
      }

      const orderRes = await client.query<{ order_id: number }>(
        `INSERT INTO orders(price, status, created_at)
             VALUES ($1, $2, NOW())
         RETURNING order_id`,
        [totalPrice, reservedStatusId]
      );
      const orderId = orderRes.rows[0].order_id;

      for (const { model, quantity } of orderRequest.items) {
        const result = await client.query<{ phone_id: number }>(
          `SELECT phone_id
            FROM phones
            WHERE model = $1
          `,
          [model]
        );
        
        await client.query(
          `INSERT INTO order_items(order_id, phone_id, quantity)
               VALUES ($1, $2, $3)`,
          [orderId, result.rows[0].phone_id, quantity]
        );
      }
      const yourAccountNumber = await paymentService.getAccountNumber();

      const retailTransaction = await createRetailTransaction({
        from: yourAccountNumber,
        to: orderRequest.accountNumber,
        amountCents: totalPrice,
        reference: orderId
      });

      if (!retailTransaction) {
        throw new Error(`Payment for phone failed`);
      }

      await client.query("COMMIT");

      await this.deliverGoods(orderId);
      return { order_id: orderId, price: totalPrice, accountNumber: yourAccountNumber  };
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

      const quantityRes = await client.query<{ total: number }>(
        `
        SELECT COALESCE(SUM(quantity), 0) AS total
          FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

      const result = await client.query<{ model: string }>(
        `
          SELECT p.model
            FROM order_items oi
            JOIN phones p ON oi.phone_id = p.phone_id
          WHERE oi.order_id = $1
          LIMIT 1
        `,
        [orderId]
      );

      const pickupRes = await createPickup({
        companyName: "pear",
        quantity: quantityRes.rows[0].total,
        recipient: "THoH",
        modelName: result.rows[0].model,
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

      await createTransaction({
        to_account_number: pickupRes.accountNumber,
        to_bank_name: "commercial-bank",
        amount: pickupRes?.amount || 0,
        description: `Payment for delivery #${ pickupRes?.refernceno}`
      });

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
        JOIN status s
          ON o.status = s.status_id
        WHERE o.order_id = $1
        `,
        [orderId]
      );

      if (orderRes.rowCount === 0) {
        return null;
      }

      const { order_id, price, created_at } = orderRes.rows[0];

      const itemsRes = await client.query<{
        phone_id: number;
        quantity: number;
      }>(
        `
        SELECT phone_id, quantity
          FROM order_items
         WHERE order_id = $1
        `,
        [orderId]
      );
      
      const newDate = new Date(created_at.getTime() + 24 * 60 * 60 * 1000);

      return {
        order_id,
        total_price: parseFloat(price),
        expires_at: newDate,
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

      const lookup = await client.query<{
        status_desc: string;
      }>(
        `
        SELECT s.description AS status_desc
          FROM orders o
          JOIN status s
            ON o.status = s.status_id
         WHERE o.order_id = $1
        `,
        [orderId]
      );
      if (lookup.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      if (lookup.rows[0].status_desc !== "reserved") {
        await client.query("ROLLBACK");
        return false;
      }

      const itemsRes = await client.query<{
        phone_id: number;
        quantity: number;
      }>(
        `
        SELECT phone_id, quantity
          FROM order_items
         WHERE order_id = $1
        `,
        [orderId]
      );

      for (const { phone_id, quantity } of itemsRes.rows) {
        await stockService.releaseReservedStock(phone_id, quantity);
      }

      await client.query(
        `
        UPDATE orders
           SET status = (
             SELECT status_id
               FROM status
              WHERE description = 'Pending'
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

      const res = await client.query<{ order_id: number }>(`
        SELECT o.order_id
          FROM orders o
          JOIN status s
            ON o.status = s.status_id
         WHERE s.description = 'reserved'
           AND o.created_at < $1`
           ,
        [cutoffTime]
    );

      for (const { order_id } of res.rows) {
        const cancelled = await this.cancelOrder(order_id);
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


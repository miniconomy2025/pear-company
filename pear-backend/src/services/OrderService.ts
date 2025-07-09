import type { PublicOrderRequest, PublicOrderResponse, OrderReservation } from "../types/publicApi.js";
import {pool} from "../config/database.js";
import { StockService } from "./StockService.js";
import { PaymentService } from "./PaymentService.js";

const stockService = new StockService();
const paymentService = new PaymentService();

export class OrderService {
  async createOrder(orderRequest: PublicOrderRequest): Promise<PublicOrderResponse> {

    if (!orderRequest.items || orderRequest.items.length === 0) {
      throw new Error("Order must contain at least one item")
    }

    for (const item of orderRequest.items) {
      if (!item.phone_id || !item.quantity || item.quantity <= 0) {
        throw new Error("Invalid item: phone_id and positive quantity required")
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const statusRes = await client.query<{ status_id: number }>(
        `SELECT status_id 
           FROM status 
          WHERE description = 'reserved'`
      );
      if (statusRes.rowCount === 0) throw new Error(`"reserved" status not found.`);
      const reservedStatusId = statusRes.rows[0].status_id;

      let totalPrice = 0;
      for (const { phone_id, quantity } of orderRequest.items) {
        const isAvailable = await stockService.checkAvailability(phone_id, quantity);
        if (!isAvailable) {
          throw new Error(
            `Not enough stock for phone ${phone_id}: requested ${quantity}.`
          );
        }

        await stockService.reserveStock(phone_id, quantity);

        const priceRes = await client.query<{ price: string }>(
          `SELECT price::text 
             FROM phones 
            WHERE phone_id = $1`,
          [phone_id]
        );
        const unitPrice = parseFloat(priceRes.rows[0].price);
        totalPrice += unitPrice * quantity;
      }

      const orderRes = await client.query<{ order_id: number }>(
        `INSERT INTO orders(price, status, created_at)
             VALUES ($1, $2, NOW())
         RETURNING order_id`,
        [totalPrice, reservedStatusId]
      );
      const orderId = orderRes.rows[0].order_id;

      for (const { phone_id, quantity } of orderRequest.items) {
        await client.query(
          `INSERT INTO order_items(order_id, phone_id, quantity)
               VALUES ($1, $2, $3)`,
          [orderId, phone_id, quantity]
        );
      }

      const yourAccountNumber = await paymentService.getAccountNumber();

      await client.query("COMMIT");
      return { order_id: orderId, price: totalPrice, accountNumber: yourAccountNumber };
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
              WHERE description = 'pending'
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

  async cleanupExpiredReservations(): Promise<void> {
    const client = await pool.connect();
    try {
      const res = await client.query<{ order_id: number }>(`
        SELECT o.order_id
          FROM orders o
          JOIN status s
            ON o.status = s.status_id
         WHERE s.description = 'reserved'
           AND o.created_at < NOW() - INTERVAL '24 hours'
      `);

      for (const { order_id } of res.rows) {
        const cancelled = await this.cancelOrder(order_id);
        if (cancelled) {
          console.log(`Expired order ${order_id} cancelled and stock released`);
        }
      }
    } finally {
      client.release();
    }
  }
}


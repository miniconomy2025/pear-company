
import pool from "../config/db.js";
import type { PublicStockItem, PublicStockResponse } from "../types/publicApi.js";

export class StockService {
  
  async getStock(): Promise<PublicStockResponse> {
    const { rows } = await pool.query<PublicStockItem>(`
      SELECT p.phone_id,
             p.model AS name,
             s.quantity_available AS quantity,
             p.price
        FROM phones p
        JOIN stock s ON p.phone_id = s.phone_id
    `);
    return { items: rows };
  }

  async checkAvailability(phoneId: number, quantity: number): Promise<boolean> {
    const { rows } = await pool.query<{ qty: number }>(
      `SELECT quantity_available AS qty FROM stock WHERE phone_id = $1`,
      [phoneId]
    );
    if (rows.length === 0) throw new Error(`Phone ${phoneId} not found in stock.`);
    return rows[0].qty >= quantity;
  }

  async reserveStock(phoneId: number, quantity: number): Promise<void> {
    await pool.query(
      `UPDATE stock
         SET quantity_available = quantity_available - $2,
             quantity_reserved  = quantity_reserved  + $2,
             updated_at         = NOW()
       WHERE phone_id = $1`,
      [phoneId, quantity]
    );
  }

  async releaseReservedStock(phoneId: number, quantity: number): Promise<void> {
    await pool.query(
      `UPDATE stock
         SET quantity_reserved  = quantity_reserved  - $2,
             quantity_available = quantity_available + $2,
             updated_at         = NOW()
       WHERE phone_id = $1`,
      [phoneId, quantity]
    );
  }
}


// src/services/StockService.ts
import { pool } from "../config/database.js";
import type { PoolClient } from "pg";
import type { PublicStockItem, PublicStockResponse } from "../types/publicApi.js";

/**
 * Use these helpers so the same code works with either a transaction client
 * or the global pool (no transaction).
 */
function getQueryRunner(client?: PoolClient) {
  return client ? client : pool;
}

export class StockService {
  async getStock(): Promise<PublicStockResponse> {
    const { rows } = await pool.query<PublicStockItem>(`
      SELECT p.phone_id,
             p.model AS name,
             s.quantity_available AS quantity,
             p.price
        FROM phones p
        JOIN stock  s ON p.phone_id = s.phone_id
    `);
    return { items: rows };
  }

  /**
   * Lightweight availability probe. Purely informational.
   * Do NOT rely on this before reserve in concurrent scenarios—use the
   * atomic reserveStock() below.
   */
  async checkAvailability(phoneId: number, quantity: number, client?: PoolClient): Promise<boolean> {
    const runner = getQueryRunner(client);
    const { rows } = await runner.query<{ qty: number }>(
      `SELECT quantity_available AS qty FROM stock WHERE phone_id = $1`,
      [phoneId]
    );
    if (rows.length === 0) throw new Error(`Phone ${phoneId} not found in stock.`);
    return rows[0].qty >= quantity;
  }

  /**
   * Atomically reserve stock.
   * Succeeds only if there is enough available; otherwise throws.
   * Use the SAME client you used to BEGIN the transaction.
   */
  async reserveStock(phoneId: number, quantity: number, client?: PoolClient): Promise<void> {
    const runner = getQueryRunner(client);
    const res = await runner.query(
      `
      UPDATE stock
         SET quantity_available = quantity_available - $2,
             quantity_reserved  = quantity_reserved  + $2,
             updated_at         = NOW()
       WHERE phone_id = $1
         AND quantity_available >= $2
      RETURNING phone_id
      `,
      [phoneId, quantity]
    );

    // If no row was returned, either the phone_id didn't exist or not enough stock.
    if (res.rowCount !== 1) {
      throw new Error(`Not enough stock or stock row missing for phone_id=${phoneId} (reserve ${quantity})`);
    }
  }

  /**
   * Atomically release previously reserved stock.
   * Succeeds only if there is enough reserved to release; otherwise throws.
   * Use the SAME client you used to BEGIN the transaction.
   */
  async releaseReservedStock(phoneId: number, quantity: number, client?: PoolClient): Promise<void> {
    const runner = getQueryRunner(client);
    const res = await runner.query(
      `
      UPDATE stock
         SET quantity_reserved  = quantity_reserved  - $2,
             quantity_available = quantity_available + $2,
             updated_at         = NOW()
       WHERE phone_id = $1
         AND quantity_reserved >= $2
      RETURNING phone_id
      `,
      [phoneId, quantity]
    );

    if (res.rowCount !== 1) {
      throw new Error(
        `Reserved stock underflow or stock row missing for phone_id=${phoneId} (release ${quantity})`
      );
    }
  }
}

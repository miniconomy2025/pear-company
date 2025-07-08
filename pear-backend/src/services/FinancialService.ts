import { pool } from "../config/database.js";

export class FinancialService {

  async getFinancialData() {
    const revenueQuery = `
        SELECT 
        SUM(oi.quantity * p.price)::INTEGER AS revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN phones p ON p.phone_id = oi.phone_id
        WHERE o.status IN (
        SELECT s.status_id FROM status s WHERE description IN ('Completed', 'Shipped', 'Delivered')
        );
    `;
    // SELECT COALESCE(SUM(price), 0) AS revenue
    //   FROM orders
    //   WHERE status IN (
    //     SELECT status_id FROM status WHERE description IN ('Completed', 'Shipped', 'Delivered')

    // const manufacturingQuery = `SELECT COALESCE(SUM(totalCost), 0) AS manufacturing FROM machine_purchases;`;
    const supplyQuery = `SELECT COALESCE(SUM(cost), 0) AS supply FROM parts_purchases;`;
    const logisticsQuery = `
      SELECT
        COALESCE(SUM(cost) * 0.1, 0) AS bulk_cost
      FROM bulk_deliveries
    `;

    const profitMarginsQuery = `
      SELECT 
          p.model AS label,
          ROUND(COALESCE(AVG(pp.cost), 0), 2) AS cost,
          ROUND(p.price, 2) AS price
        FROM phones p
        LEFT JOIN parts_purchases pp ON TRUE
        GROUP BY p.model, p.price
        ORDER BY p.model;
    `;

    // const [revenueRes, manufacturingRes, supplyRes, logisticsRes, profitMarginsRes] =
    const [revenueRes, supplyRes, logisticsRes, profitMarginsRes] =
      await Promise.all([
        pool.query(revenueQuery),
        // pool.query(manufacturingQuery),
        pool.query(supplyQuery),
        pool.query(logisticsQuery),
        pool.query(profitMarginsQuery),
      ]);

    const revenue = Number(revenueRes.rows[0].revenue);
    // const manufacturing = Number(manufacturingRes.rows[0].manufacturing);
    const supply = Number(supplyRes.rows[0].supply);
    const logistics =
      //   Number(logisticsRes.rows[0].consumer_cost) +
      Number(logisticsRes.rows[0].bulk_cost);

    // Simulated loans
    const loanStatus = {
      borrowed: 8000,
      repaid: 5000,
      remaining: 3000,
    };

    const profitMargins = profitMarginsRes.rows;

    return {
      revenue,
      expenses: {
        // manufacturing,
        logistics,
        loans: loanStatus.borrowed,
        // equipment: manufacturing, 
        supply,
      },
      loanStatus,
      profitMargins,
    };
  }
}

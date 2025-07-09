import { pool } from "../config/database.js";

export class ProductionService {
  getProductionLevels = async () => {
    const query = `
        SELECT 
        p.model,
        (s.quantity_available + s.quantity_reserved) AS total
        FROM stock s
        JOIN phones p ON p.phone_id = s.phone_id
        ORDER BY p.model;
      `;

    const result = await pool.query(query);
    return result.rows;
  };
}

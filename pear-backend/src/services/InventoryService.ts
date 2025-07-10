import { pool } from "../config/database.js";

export class InventoryService {
  getInventoryLevels = async () => {
    const query = `
        SELECT 
        p.name AS part,
        i.quantity_available AS quantity
        FROM 
        inventory i
        JOIN 
        parts p ON i.part_id = p.part_id
        ORDER BY 
        p.name;

      `;

    const result = await pool.query(query);
    return result.rows;
  };
}

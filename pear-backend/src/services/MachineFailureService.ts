import { pool } from "../config/database.js"
import type { MachineFailureRequest } from "../types/publicApi.js"

export class MachineFailureService {

  async failedMachine(machines: MachineFailureRequest): Promise<void> {
    const client = await pool.connect()
    try {
        await client.query('BEGIN');
        const timestamp = `${machines.simulationDate} ${machines.simulationTime}`;

        const retireQuery = `
        WITH to_retire AS (
            SELECT m.machine_id
            FROM machines m
            JOIN phones p ON m.phone_id = p.phone_id
            WHERE p.model = $1
            AND m.date_retired IS NULL
            ORDER BY m.date_acquired
            LIMIT $2
        )
        UPDATE machines AS m
        SET date_retired = to_timestamp($3, 'YYYY-MM-DD HH24:MI:SS')
        FROM to_retire tr
        WHERE m.machine_id = tr.machine_id
        RETURNING m.machine_id;
        `;
        const updateRes = await client.query(retireQuery, [machines.machineName, machines.failureQuantity, timestamp]);
        await client.query('COMMIT');
    } catch (error) {
        console.error("Error getting machine status:", error)
    } finally {
        client.release()
    }
  }
}

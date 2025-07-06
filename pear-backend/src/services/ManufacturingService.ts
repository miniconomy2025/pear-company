import pool from "../config/db.js";

export class ManufacturingService {
  
    async phoneManufacturing(phoneId: number, quantity: number): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const simTime = new Date().toISOString();

            const machinesRes = await client.query<{
                machine_id: number;
                rate_per_day: number;
            }>(
                `SELECT machine_id, rate_per_day
                FROM machines
                WHERE phone_id = $1`,
                [phoneId]
            );
            if (machinesRes.rowCount === 0) {
                throw new Error(`No machines configured for phone ${phoneId}`);
            }

            const partsRes = await client.query<{
                inventory_id:        number;
                part_id:             number;
                quantity_available:  number;
            }>(
                `SELECT inventory_id,
                        part_id,
                        quantity_available
                FROM inventory`
            );

            const partUsage = new Map<number, number>();
            let phoneProduction = 0;

            for (const { machine_id, rate_per_day } of machinesRes.rows) {

                const ratiosRes = await client.query<{
                part_id: number;
                name: string;
                quantity: number;
                }>(
                `
                SELECT mr.part_id, p.name, mr.quantity
                    FROM machine_ratios mr
                    JOIN parts p ON p.part_id = mr.part_id
                WHERE mr.machine_id = $1
                `,
                [machine_id]
                );

                let produced = (quantity > rate_per_day) && rate_per_day || quantity;
                for (const { part_id, quantity_available } of partsRes.rows) {
                
                const part = ratiosRes.rows.find(row => row.part_id === part_id);
                
                const phonesProducable = (part?.quantity && Math.floor( quantity_available / part?.quantity)) || 0;

                if (phonesProducable < produced) {
                    produced = phonesProducable;
                }
                }

                if (produced <= 0) {
                continue;
                }

                let screensUsed = 0;
                let electronicsUsed = 0;
                let casesUsed = 0;

                for (const { part_id, name, quantity } of ratiosRes.rows) {
                    const needed = quantity * produced;
                    partUsage.set(part_id, (partUsage.get(part_id) || 0) + needed);

                    switch (name) {
                        case 'screen': screensUsed += needed; break;
                        case 'electronics': electronicsUsed += needed; break;
                        case 'case': casesUsed += needed; break;
                    }
                }

                phoneProduction += produced;
            }

            for (const [part_id, used] of partUsage.entries()) {
                await client.query(
                `UPDATE inventory
                    SET quantity_available = quantity_available - $2
                WHERE part_id = $1`,
                [part_id, used]
                );
            }

            await client.query(
                `UPDATE stock
                    SET quantity_available = quantity_available + $2,
                        updated_at         = $3
                WHERE phone_id = $1`,
                [phoneId, phoneProduction, simTime]
            );

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
        throw err;
        } finally {
            client.release();
        }
    }

    async calculatePhoneDemand(): Promise<Array<{ phone_id: number; demand: number, stockNeeded: number }>> {
        const client = await pool.connect();
        try {
            const maxStockLevel = 10000;
            const res = await client.query<{
                phone_id: number;
                quantity_available: number;
                capacity: number;
            }>(
                `
                SELECT s.phone_id,
                    s.quantity_available,
                    COALESCE(SUM(m.rate_per_day), 0) AS capacity
                FROM stock s
                LEFT JOIN machines m ON m.phone_id = s.phone_id
                GROUP BY s.phone_id, s.quantity_available
                `
            );
            return res.rows.map(r => ({
                phone_id: r.phone_id,
                demand: Math.min(r.capacity, Math.max(0, maxStockLevel - r.quantity_available)),
                stockNeeded: Math.max(0, maxStockLevel - r.quantity_available),
            }));
        } finally {
            client.release();
        }
    }

    async processManufacturing(): Promise<void> {
        try {
            const phoneDemand = await this.calculatePhoneDemand();
            phoneDemand.sort((a, b) => a.stockNeeded - b.stockNeeded);

            for (const { phone_id, demand } of phoneDemand) {
                await this.phoneManufacturing(phone_id, demand);
            }
        } catch (error) {
            console.error("Error manufacturing goods:", error);
        }
    }
}

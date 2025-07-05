import type { SimulationResponse } from "../types/publicApi.js"
import type { OrderService } from "./OrderService.js"
import pool from "../config/db.js";

export class SimulationService {
  private currentTick = 0
  private simulationRunning = false

  constructor(private orderService: OrderService) {}

  async startSimulation(): Promise<SimulationResponse> {
    this.simulationRunning = true
    this.currentTick = 0

    console.log("Simulation started")

    return {
      message: "Simulation started successfully",
      tick: this.currentTick,
      status: "running",
    }
  }

  async processSimulationTick(): Promise<SimulationResponse> {
    if (!this.simulationRunning) {
      throw new Error("Simulation is not running. Start simulation first.")
    }

    this.currentTick++ 

    // Process manufacturing (machines produce phones)
    await this.processManufacturing()

    // Clean up expired reservations
    this.orderService.cleanupExpiredReservations()

    // TODO: Process delivery statuses
    // TODO: Process any scheduled events

    console.log(`Simulation tick ${this.currentTick} processed`)

    return {
      message: `Simulation tick ${this.currentTick} processed`,
      tick: this.currentTick,
      status: "running",
    }
  }

  private async processManufacturing(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const simTime = new Date().toISOString();

      const machinesRes = await client.query<{
        machine_id: number;
        phone_id: number;
        rate_per_day: number;
      }>(
        `SELECT machine_id, phone_id, rate_per_day FROM machines`
      );

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
      const phoneProduction = new Map<number, number>();

      for (const { machine_id, phone_id, rate_per_day } of machinesRes.rows) {

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

        let produced = rate_per_day;
        for (const { part_id, quantity_available } of partsRes.rows) {
          
          const part = ratiosRes.rows.find(row => row.part_id === part_id);
          const part_ratio = part?.quantity || 0;

          const phonesProducable = Math.floor( quantity_available / part_ratio);
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

        phoneProduction.set(phone_id, (phoneProduction.get(phone_id) || 0) + produced);
      }

      for (const [part_id, used] of partUsage.entries()) {
        await client.query(
          `UPDATE inventory
             SET quantity_available = quantity_available - $2
           WHERE part_id = $1`,
          [part_id, used]
        );
      }

      for (const [phone_id, produced] of phoneProduction.entries()) {
        await client.query(
          `UPDATE stock
             SET quantity_available = quantity_available + $2,
                 updated_at         = $3
           WHERE phone_id = $1`,
          [phone_id, produced, simTime]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  getCurrentTick(): number {
    return this.currentTick
  }

  isRunning(): boolean {
    return this.simulationRunning
  }
}

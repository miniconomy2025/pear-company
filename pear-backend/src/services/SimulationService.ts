import type { SimulationResponse } from "../types/publicApi.js"
import type { OrderService } from "./OrderService.js"
import type { ManufacturingService } from "./ManufacturingService.js"
import { SimulatedClock } from "../utils/SimulatedClock.js"
import { pool } from "../config/database.js"

export class SimulationService {
  private currentTick = 0
  private simulationRunning = false

  constructor(
    private orderService: OrderService,
    private manufacturingService: ManufacturingService,
  ) {}

   private async cleanSimulationData(): Promise<void> {
    const client = await pool.connect()
    try {
      console.log("Cleaning simulation data...")
      await client.query("CALL clear_all_except_status_and_phones()")
      console.log(" Simulation data cleaned successfully")
    } catch (error) {
      console.error("Error cleaning simulation data:", error)
      throw error
    } finally {
      client.release()
    }
  }

  async startSimulation(): Promise<SimulationResponse> {
    if (this.simulationRunning) {
      return {
        message: "Simulation is already running.",
        tick: SimulatedClock.getCurrentSimulatedDayOffset(),
        status: "running",
      }
    }

    try {
      await this.cleanSimulationData();

      // TEMPORARY: Mock the external API call for testing
      console.log("TESTING MODE: Using mock epoch time instead of external API...")

      const thohEpochStartMs = Date.now()

      console.log(`Mock epoch start time: ${new Date(thohEpochStartMs).toISOString()}`)

      /* COMMENTED OUT FOR TESTING - UNCOMMENT WHEN EXTERNAL API IS READY
      console.log("Fetching simulation start time from external Simulation API...")
      const thohEpochStartStr = await getUnixEpochStartTime()

      if (!thohEpochStartStr) {
        throw new Error("Did not receive a valid epoch start time from Simulation API.")
      }

      const thohEpochStartMs = Number.parseInt(thohEpochStartStr, 10)
      if (isNaN(thohEpochStartMs)) {
        throw new Error("Invalid epoch time received from Simulation API (not a number).")
      }
      */

      SimulatedClock.setSimulationStartTime(thohEpochStartMs, new Date("2050-01-01T00:00:00Z"))

      this.simulationRunning = true

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
    await this.manufacturingService.processManufacturing();

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

  getCurrentTick(): number {
    return this.currentTick
  }

  isRunning(): boolean {
    return this.simulationRunning
  }
}

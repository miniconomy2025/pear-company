import type { SimulationResponse } from "../types/publicApi.js"
import type { OrderService } from "./OrderService.js"
import type { ManufacturingService } from "./ManufacturingService.js"
import { SimulatedClock } from "../utils/SimulatedClock.js"
import { pool } from "../config/database.js"
import type { BankingService } from "../services/BankingService.js"
import type { MachinePurchasingService } from "./MachinePurchasingService.js"
import { PartsInventoryService } from "./PartsInventoryService.js";

export class SimulationService {
  private simulationRunning = false
  private tickTimer: NodeJS.Timeout | null = null
  private readonly TICK_INTERVAL_MS = 2 * 60 * 1000

  constructor(private orderService: OrderService, private manufacturingService: ManufacturingService) {}

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
      const thohResponse = await getUnixEpochStartTime()

      if (!thohResponse || !thohResponse.unixEpochStartTime) {
        throw new Error("Did not receive a valid epoch start time from Simulation API.")
      }

      const thohEpochStartMs = Number.parseInt(thohResponse.unixEpochStartTime, 10)
      if (isNaN(thohEpochStartMs)) {
        throw new Error("Invalid epoch time received from Simulation API (not a number).")
      }
      */

      SimulatedClock.setSimulationStartTime(thohEpochStartMs, new Date("2050-01-01T00:00:00Z"))

      this.simulationRunning = true

      this.startAutoTick()
      console.log("Simulation started with automatic daily ticking every 2 minutes.")

      await this.bankingService.initializeBanking()

      await this.machinePurchasingService.initializeMachines()

      return {
        message: "Simulation started successfully with automatic daily ticking",
        tick: SimulatedClock.getCurrentSimulatedDayOffset(),
        status: "running",
      }
    } catch (error) {
      console.error("Error starting simulation:", error)
      throw new Error(`Failed to start simulation: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private startAutoTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
    }

    this.tickTimer = setInterval(async () => {
      try {
        await this.processSimulationTick()
      } catch (error) {
        console.error("Error during automatic simulation tick:", error)
      }
    }, this.TICK_INTERVAL_MS)
  }

  private stopAutoTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
      console.log("⏹️ Automatic tick timer stopped")
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

    console.log(`Simulation tick (day ${dayOffset}) processed for ${simDate}`)
    console.log(`---`)

    return {
      message: `Simulation tick (day ${dayOffset}) processed`,
      tick: dayOffset,
      status: "running",
    }
  }

  getCurrentTick(): number {
    return SimulatedClock.getCurrentSimulatedDayOffset()
  }

  isRunning(): boolean {
    return this.simulationRunning
  }

  cleanup(): void {
    this.stopAutoTick()
    this.simulationRunning = false
    console.log("SimulationService cleanup completed")
  }
}

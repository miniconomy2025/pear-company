import type { SimulationResponse } from "../types/publicApi.js"
import type { OrderService } from "./OrderService.js"
import type { ManufacturingService } from "./ManufacturingService.js"
import {pool} from "../config/database.js";

export class SimulationService {
  private currentTick = 0
  private simulationRunning = false

  constructor(private orderService: OrderService, private manufacturingService: ManufacturingService) {}

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

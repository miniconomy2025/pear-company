import type { Request, Response } from "express"
import type { SimulationService } from "../services/SimulationService.js"

export class SimulationController {
  constructor(private simulationService: SimulationService) {}

  startSimulation = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.simulationService.startSimulation()
      res.status(200).json(result)
    } catch (error) {
      console.error("Error starting simulation:", error)
      res.status(500).json({
        error: "Failed to start simulation",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  processSimulationTick = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.simulationService.processSimulationTick()
      res.status(200).json(result)
    } catch (error) {
      console.error("Error processing simulation tick:", error)
      res.status(400).json({
        error: "Simulation tick failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

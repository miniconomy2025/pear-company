import type { Request, Response } from "express"
import type { MachineFailureRequest } from "../types/publicApi.js"
import type { MachineFailureService } from "../services/MachineFailureService.js"

export class MachineFailureController {
  constructor(private machineFailureService: MachineFailureService) {}

  failedMachine = async (req: Request, res: Response): Promise<void> => {
    try {
      const machine: MachineFailureRequest = req.body
      await this.machineFailureService.failedMachine(machine)
      res.status(200).json({ message: "Machine failure recorded" })
    } catch (error) {
      console.error("Error on machine failure recording:", error)
      res.status(400).json({
        error: "Invalid machine failure data",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

import type { Request, Response } from "express"
import type { DeliveryConfirmation } from "../types/publicApi.js"
import type { LogisticsService } from "../services/LogisticsService.js"

export class LogisticsController {
  constructor(private logisticsService: LogisticsService) {}

  confirmGoodsDelivered = async (req: Request, res: Response): Promise<void> => {
    try {
      const delivery: DeliveryConfirmation = req.body
      await this.logisticsService.confirmGoodsDelivered(delivery)
      res.status(200).json({ message: "Bulk delivery recorded" })
    } catch (error) {
      console.error("Error confirming goods delivered:", error)
      res.status(400).json({
        error: "Invalid delivery data",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  confirmGoodsCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const collection: DeliveryConfirmation = req.body
      await this.logisticsService.confirmGoodsCollection(collection)
      res.status(200).json({ message: "Consumer delivery recorded" })
    } catch (error) {
      console.error("Error confirming goods collection:", error)
      res.status(400).json({
        error: "Invalid delivery data",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

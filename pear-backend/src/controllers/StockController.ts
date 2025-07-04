import type { Request, Response } from "express"
import type { StockService } from "../services/StockService.js"

export class StockController {
  constructor(private stockService: StockService) {}

  getStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const stock = await this.stockService.getStock()
      res.status(200).json(stock)
    } catch (error) {
      console.error("Error getting stock:", error)
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

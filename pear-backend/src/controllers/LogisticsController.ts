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

  getBulkDeliveries = async (req: Request, res: Response) => {
    try {
      const bulkDeliveries =
        await this.logisticsService.getBulkDeliveries();
      res.json(bulkDeliveries);
    } catch (error) {
      console.error("Error fetching bulk deliveries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getConsumerDeliveries = async (req: Request, res: Response) => {
    try {
      const consumerDeliveries =
        await this.logisticsService.getConsumerPendingDeliveries();
      res.json(consumerDeliveries);
    } catch (error) {
      console.error("Error fetching consumer deliveries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getConsumerPendingDeliveries = async (req: Request, res: Response) => {
    try {
      const consumerPendingDeliveries =
        await this.logisticsService.getConsumerPendingDeliveries();
      res.json(consumerPendingDeliveries);
    } catch (error) {
      console.error("Error fetching consumer pending deliveries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

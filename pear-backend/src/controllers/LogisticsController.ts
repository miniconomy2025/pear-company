import type { Request, Response } from "express"
import type { DeliveryConfirmation, PickupRequest, DeliveryRequest } from "../types/publicApi.js"
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

  handleLogistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.body;
      if (type === "DELIVERY") {
        const collection: DeliveryConfirmation = req.body;
        await this.logisticsService.confirmGoodsDelivered(collection);
        res.status(200).json({ message: "Bulk delivery recorded" });
      } else if (type === "PICKUP") {
        const delivery: DeliveryConfirmation = req.body;
        await this.logisticsService.confirmGoodsCollection(delivery);
        res.status(200).json({ message: "Consumer pickup recorded" });
      } else {
        res.status(400).json({ error: "Invalid or missing type (must be DELIVERY or PICKUP)" });
      }
    } catch (error) {
      console.error("Error in /logistics:", error);
      res.status(400).json({
        error: "Invalid logistics data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  notifyLogisticsDelivered = async (req: Request, res: Response) => {
    try {
      const { delivery_reference } = req.body;
      await this.logisticsService.notifyDelivery(delivery_reference);
      res.status(201).json({ message: "Phone given" });
    } catch (error) {
      console.error("Error in notifyLogisticsDelivered:", error);
      res.status(500).json({ error: "An error occurred while giving phone to person" });
    }
  };
}

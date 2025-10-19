import type { Request, Response } from "express";
import type { LogisticsService } from "../services/LogisticsService.js";

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export class LogisticsController {
  constructor(private logisticsService: LogisticsService) {}

  getBulkDeliveries = async (_req: Request, res: Response) => {
    try {
      const bulkDeliveries = await this.logisticsService.getBulkDeliveries();
      res.json(bulkDeliveries);
    } catch (error) {
      console.error("Error fetching bulk deliveries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getConsumerDeliveries = async (_req: Request, res: Response) => {
    try {
      const consumerDeliveries =
        await this.logisticsService.getConsumerPendingDeliveries();
      res.json(consumerDeliveries);
    } catch (error) {
      console.error("Error fetching consumer deliveries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getConsumerPendingDeliveries = async (_req: Request, res: Response) => {
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
    const { type, id } = (req.body ?? {}) as {
      type?: unknown;
      id?: unknown;
    };

    if (type !== "DELIVERY" && type !== "PICKUP") {
      res
        .status(400)
        .json({ error: "Invalid or missing type (must be DELIVERY or PICKUP)" });
      return;
    }
    if (!(isNonEmptyString(id) || typeof id === "number")) {
      res.status(400).json({ error: "Invalid or missing id" });
      return;
    }

    const ref = String(id);

    try {
      if (type === "DELIVERY") {
        await this.logisticsService.confirmGoodsDelivered(ref);
        res.status(200).json({ message: "Bulk delivery recorded" });
      } else {
        await this.logisticsService.confirmGoodsCollection(ref);
        res.status(200).json({ message: "Consumer pickup recorded" });
      }
    } catch (error) {
      console.error("Error in /logistics handleLogistics:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  notifyLogisticsDelivered = async (req: Request, res: Response) => {
    const { delivery_reference } = (req.body ?? {}) as { delivery_reference?: unknown };

    if (!(isNonEmptyString(delivery_reference) || typeof delivery_reference === "number")) {
      res.status(400).json({ error: "Invalid or missing delivery_reference" });
      return;
    }

    const ref = String(delivery_reference);

    try {
      await this.logisticsService.notifyDelivery(ref);
      res.status(200).json({ message: "Phone given" });
    } catch (error) {
      console.error("Error in notifyLogisticsDelivered:", error);
      res
        .status(500)
        .json({ error: "An error occurred while giving phone to person" });
    }
  };
}

import type { Request, Response } from "express";
import type { InventoryService } from "../services/InventoryService.js";

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}
  getInventoryReport = async (req: Request, res: Response) => {
    try {
      const inventoryLevels =
        await this.inventoryService.getInventoryLevels();
      res.json(inventoryLevels);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

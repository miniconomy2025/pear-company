import type { Request, Response } from "express";
import type { ProductionService } from "../services/ProductionService.js";

export class ProductionController {
  constructor(private productionService: ProductionService) {}
  getProductionReport = async (req: Request, res: Response) => {
    try {
      const productionLevels =
        await this.productionService.getProductionLevels();
      res.json(productionLevels);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

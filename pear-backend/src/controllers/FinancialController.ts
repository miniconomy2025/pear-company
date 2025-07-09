import type { Request, Response } from "express";
import type { FinancialService } from "../services/FinancialService.js";

export class FinancialController {
  constructor(private financialService: FinancialService) {}
  getFinancialData = async (req: Request, res: Response) => {
    try {
      const finances =
        await this.financialService.getFinancialData();
      res.json(finances);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
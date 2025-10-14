import { jest  } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";

type QueryResultMock<T extends QueryResultRow> = Promise<Pick<QueryResult<T>, "rows">>;

const pool = {
  query: jest.fn() as jest.MockedFunction<
    <T extends QueryResultRow = any>(text: string, params?: any[]) => QueryResultMock<T>
  >,
};

// Use factory function so Jest doesn't hoist before pool exists
jest.mock("../../../src/config/database", () => {
  return {
    __esModule: true,
    pool,
  };
});

import { StockService } from "../../../src/services/StockService";
import { describe, it, expect, beforeEach } from "@jest/globals";

let stockService: StockService;

beforeEach(() => {
  stockService = new StockService();
  jest.clearAllMocks();
});

describe("StockService", () => {
  describe("getStock", () => {
    it("should return current stock levels", async () => {
      pool.query.mockResolvedValue({
        rows: [
          { phone_id: 1, name: "ePhone", quantity: 50, price: 299.99 },
          { phone_id: 2, name: "ePhone Plus", quantity: 25, price: 599.99 },
        ],
      });

      const result = await stockService.getStock();

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        phone_id: 1,
        name: "ePhone",
        quantity: 50,
        price: 299.99,
      });
    });

    it("should handle empty stock", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await stockService.getStock();
      expect(result.items).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database connection failed"));

      await expect(stockService.getStock()).rejects.toThrow("Database connection failed");
    });
  });

  describe("checkAvailability", () => {
    it("should return true when stock is available", async () => {
      pool.query.mockResolvedValue({
        rows: [{ qty: 50 }],
      });

      const result = await stockService.checkAvailability(1, 10);
      expect(result).toBe(true);
    });

    it("should return false when stock is insufficient", async () => {
      pool.query.mockResolvedValue({
        rows: [{ qty: 5 }],
      });

      const result = await stockService.checkAvailability(1, 10);
      expect(result).toBe(false);
    });

    it("should throw when phone does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(stockService.checkAvailability(999, 1)).rejects.toThrow(
        "Phone 999 not found in stock."
      );
    });
  });

  describe("reserveStock", () => {
    it("should call UPDATE with correct params", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await stockService.reserveStock(1, 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE stock"),
        [1, 10]
      );
    });
  });

  describe("releaseReservedStock", () => {
    it("should call UPDATE with correct params", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await stockService.releaseReservedStock(1, 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE stock"),
        [1, 10]
      );
    });
  });
});

import { StockService } from "../../../src/services/StockService";
import { createMockPool, mockQuerySuccess, mockQueryError, MockedPoolClient } from "../../helpers/mockDatabase";
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

let stockService: StockService;
let mockClient: MockedPoolClient;

const { mockPool, mockClient: client } = createMockPool();

// Mock database module
jest.mock("../../../src/config/database", () => ({
  pool: mockPool,
}));

beforeEach(() => {
  stockService = new StockService();
  mockClient = client;

  // Reset mocks
  jest.clearAllMocks();
});

describe("StockService", () => {

  describe("getStock", () => {
    it("should return current stock levels", async () => {
      mockQuerySuccess(mockClient, [
        { phone_id: 1, model: "ePhone", quantity_available: 50, price: 299.99 },
        { phone_id: 2, model: "ePhone plus", quantity_available: 25, price: 599.99 },
      ]);

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
      mockQuerySuccess(mockClient, []);

      const result = await stockService.getStock();
      expect(result.items).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      mockQueryError(mockClient, new Error("Database connection failed"));

      await expect(stockService.getStock()).rejects.toThrow("Database connection failed");
    });
  });

  describe("reserveStock", () => {
    it("should successfully reserve stock", async () => {
      mockQuerySuccess(mockClient, [], 1);

      const result = await stockService.reserveStock(1, 10);

      expect(result).toBe(true);
    });

    it("should return false when insufficient stock", async () => {
      mockQuerySuccess(mockClient, [], 0);

      const result = await stockService.reserveStock(1, 1000);
      expect(result).toBe(false);
    });

    it("should handle negative quantities", async () => {
      await expect(stockService.reserveStock(1, -5)).rejects.toThrow();
    });
  });

  describe("releaseReservedStock", () => {
    it("should release reserved stock back to available", async () => {
      mockQuerySuccess(mockClient, [], 1);

      const result = await stockService.releaseReservedStock(1, 10);

      expect(result).toBe(true);
    });
  });

  describe("checkAvailability", () => {
    it("should return true when stock is available", async () => {
      mockQuerySuccess(mockClient, [{ quantity_available: 50 }]);

      const result = await stockService.checkAvailability(1, 10);
      expect(result).toBe(true);
    });

    it("should return false when stock is insufficient", async () => {
      mockQuerySuccess(mockClient, [{ quantity_available: 5 }]);

      const result = await stockService.checkAvailability(1, 10);
      expect(result).toBe(false);
    });

    it("should return false when phone does not exist", async () => {
      mockQuerySuccess(mockClient, []);

      const result = await stockService.checkAvailability(999, 1);
      expect(result).toBe(false);
    });
  });

});

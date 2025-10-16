import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { ManufacturingService } from "../../../src/services/ManufacturingService";

jest.mock("../../../src/config/database", () => ({
  pool: { connect: jest.fn() },
}));

import { pool } from "../../../src/config/database";

type MockClient = {
  query: jest.MockedFunction<
    (queryText: string, params?: any[]) => Promise<any>
  >;
  release: jest.MockedFunction<() => void>;
};

describe("ManufacturingService", () => {
  let service: ManufacturingService;
  let mockClient: MockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ManufacturingService();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (
      pool.connect as unknown as jest.MockedFunction<() => Promise<MockClient>>
    ).mockResolvedValue(mockClient);
  });

  it("should manufacture phones and update inventory and stock", async () => {
    const simulatedDate = new Date();

    mockClient.query.mockImplementation(async (query, params) => {
      if (query.includes("FROM machines")) {
        return { rowCount: 1, rows: [{ machine_id: 1, rate_per_day: 5 }] };
      }
      if (query.includes("FROM inventory")) {
        return {
          rows: [
            { inventory_id: 1, part_id: 1, quantity_available: 20 },
            { inventory_id: 2, part_id: 2, quantity_available: 10 },
          ],
        };
      }
      if (query.includes("FROM machine_ratios")) {
        return {
          rows: [
            { part_id: 1, name: "A", quantity: 2 },
            { part_id: 2, name: "B", quantity: 1 },
          ],
        };
      }
      if (
        query.startsWith("UPDATE inventory") ||
        query.startsWith("UPDATE stock")
      ) {
        return { rowCount: 1, rows: [] };
      }
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    });

    await service.phoneManufacturing(1, 5, simulatedDate);

    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE inventory"),
      expect.any(Array)
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE stock"),
      expect.any(Array)
    );
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
  });

  it("should rollback if an error occurs during manufacturing", async () => {
    mockClient.query.mockImplementation(async (query) => {
      if (query === "BEGIN") return { rowCount: 0, rows: [] };
      if (query.includes("FROM machines")) throw new Error("DB error");
      return { rowCount: 0, rows: [] };
    });

    await expect(service.phoneManufacturing(1, 5, new Date())).rejects.toThrow(
      "DB error"
    );
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("should calculate phone demand correctly", async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { phone_id: 1, quantity_available: 8000, capacity: 3000 },
        { phone_id: 2, quantity_available: 10000, capacity: 5000 },
      ],
    });

    const result = await service.calculatePhoneDemand();

    expect(result).toEqual([
      { phone_id: 1, demand: 2000, stockNeeded: 2000 },
      { phone_id: 2, demand: 0, stockNeeded: 0 },
    ]);
  });

  it("should process manufacturing for all phones in demand order", async () => {
    const simulatedDate = new Date();

    const phoneManufacturingSpy = jest
      .spyOn(service, "phoneManufacturing")
      .mockResolvedValue();

    jest.spyOn(service, "calculatePhoneDemand").mockResolvedValue([
      { phone_id: 1, demand: 10, stockNeeded: 10 },
      { phone_id: 2, demand: 5, stockNeeded: 5 },
    ]);

    await service.processManufacturing(simulatedDate);

    expect(phoneManufacturingSpy).toHaveBeenNthCalledWith(
      1,
      2,
      5,
      simulatedDate
    );
    expect(phoneManufacturingSpy).toHaveBeenNthCalledWith(
      2,
      1,
      10,
      simulatedDate
    );
  });

  it("should handle errors in processManufacturing gracefully", async () => {
    jest
      .spyOn(service, "calculatePhoneDemand")
      .mockRejectedValue(new Error("fail"));
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await service.processManufacturing(new Date());

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error manufacturing goods:"),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

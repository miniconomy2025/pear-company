import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import { ProductionService } from "../../../src/services/ProductionService";
import { pool } from "../../../src/config/database";

jest.mock("../../../src/config/database", () => ({
  pool: { query: jest.fn() },
}));

describe("ProductionService", () => {
  let service: ProductionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully fetch production levels", async () => {
    const mockRows = [
      { model: "PearPhone X", total: 200 },
      { model: "PearPhone SE", total: 150 },
    ];

    const mockQuery = pool.query as unknown as jest.MockedFunction<
      (query: string, params?: any[]) => Promise<{ rows: typeof mockRows }>
    >;

    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await service.getProductionLevels();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
    expect(result).toEqual(mockRows);
  });

  it("should return an empty array when no results", async () => {
    const mockQuery = pool.query as unknown as jest.MockedFunction<
      (query: string, params?: any[]) => Promise<{ rows: any[] }>
    >;

    mockQuery.mockResolvedValue({ rows: [] });

    const result = await service.getProductionLevels();

    expect(result).toEqual([]);
    expect(mockQuery).toHaveBeenCalled();
  });

  it("should throw if database query fails", async () => {
    const mockQuery = pool.query as unknown as jest.MockedFunction<
      (query: string, params?: any[]) => Promise<any>
    >;

    mockQuery.mockRejectedValue(new Error("DB Error"));

    await expect(service.getProductionLevels()).rejects.toThrow("DB Error");
    expect(mockQuery).toHaveBeenCalled();
  });
});

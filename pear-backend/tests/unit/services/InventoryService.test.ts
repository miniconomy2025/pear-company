import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

// ---- Match your example’s typing/casting style ----
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

// Single mocked pool with typed query()
const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
};

// ESM-safe factory so the service gets our pool instance
jest.mock("../../../src/config/database.js", () => {
  return { __esModule: true, pool };
});

import { InventoryService } from "../../../src/services/InventoryService";

let service: InventoryService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new InventoryService();
});

describe("InventoryService", () => {
  describe("getInventoryLevels", () => {
    it("returns parts and quantities", async () => {
      pool.query.mockResolvedValue({
        rows: [
          { part: "Camera Module", quantity: 12 },
          { part: "Screen", quantity: 7 },
        ],
      });

      const res = await service.getInventoryLevels();

      expect(pool.query).toHaveBeenCalledTimes(1);
      // sanity check the SQL text shape (don’t assert the whole string)
      expect(pool.query.mock.calls[0][0]).toEqual(expect.stringContaining("FROM"));
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({ part: "Camera Module", quantity: 12 });
    });

    it("returns empty array when no rows", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const res = await service.getInventoryLevels();

      expect(res).toEqual([]);
    });

    it("propagates database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database connection failed"));

      await expect(service.getInventoryLevels()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });
});

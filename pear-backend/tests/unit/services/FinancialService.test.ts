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

// Use a factory so Jest gets our pool instance (ESM-safe)
jest.mock("../../../src/config/database.js", () => {
  return { __esModule: true, pool };
});

import { FinancialService } from "../../../src/services/FinancialService";

let service: FinancialService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new FinancialService();
});

describe("FinancialService", () => {
  describe("getFinancialData", () => {
    it("returns aggregated financial data with numeric outputs", async () => {
      // The service calls pool.query 5 times (Promise.all):
      // revenue, manufacturing, supply, logistics, profitMargins (in that order)
      pool.query
        .mockResolvedValueOnce({
          rows: [{ revenue: 10500 }], // revenue
        })
        .mockResolvedValueOnce({
          rows: [{ manufacturing: 2000 }], // manufacturing
        })
        .mockResolvedValueOnce({
          rows: [{ supply: 300 }], // supply
        })
        .mockResolvedValueOnce({
          rows: [{ bulk_cost: 150 }], // logistics
        })
        .mockResolvedValueOnce({
          rows: [
            { label: "ePhone", cost: 100.5, price: 299.99 },
            { label: "ePhone Plus", cost: 120.25, price: 399.99 },
          ], // profitMargins
        });

      const result = await service.getFinancialData();

      expect(pool.query).toHaveBeenCalledTimes(5);
      // (Optional) sanity on first SQL shape:
      expect(pool.query.mock.calls[0][0]).toEqual(
        expect.stringContaining("SUM(oi.quantity * p.price)")
      );

      expect(result).toEqual({
        revenue: 10500,
        expenses: {
          manufacturing: 2000,
          logistics: 150,
          supply: 300,
        },
        profitMargins: [
          { label: "ePhone", cost: 100.5, price: 299.99 },
          { label: "ePhone Plus", cost: 120.25, price: 399.99 },
        ],
      });
    });

    it("coerces string values from DB into numbers", async () => {
      // Return numeric strings to verify `Number(...)` coercion
      pool.query
        .mockResolvedValueOnce({ rows: [{ revenue: "1000" }] })
        .mockResolvedValueOnce({ rows: [{ manufacturing: "200" }] })
        .mockResolvedValueOnce({ rows: [{ supply: "50" }] })
        .mockResolvedValueOnce({ rows: [{ bulk_cost: "30" }] })
        .mockResolvedValueOnce({ rows: [] }); // empty profitMargins

      const result = await service.getFinancialData();

      expect(result.revenue).toBe(1000);
      expect(result.expenses).toEqual({
        manufacturing: 200,
        logistics: 30,
        supply: 50,
      });
      expect(result.profitMargins).toEqual([]);
    });

    it("handles zero totals and empty margins", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ revenue: 0 }] })
        .mockResolvedValueOnce({ rows: [{ manufacturing: 0 }] })
        .mockResolvedValueOnce({ rows: [{ supply: 0 }] })
        .mockResolvedValueOnce({ rows: [{ bulk_cost: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getFinancialData();

      expect(result).toEqual({
        revenue: 0,
        expenses: { manufacturing: 0, logistics: 0, supply: 0 },
        profitMargins: [],
      });
    });
  });
});

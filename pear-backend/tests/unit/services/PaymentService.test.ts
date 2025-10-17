import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

/** --- PG mock typings (same pattern as your other tests) --- */
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

/** --- DB mocks (client + pool) --- */
const client = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  release: jest.fn() as jest.MockedFunction<() => void>,
};

const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  connect: jest.fn() as jest.MockedFunction<() => Promise<typeof client>>,
};
pool.connect.mockResolvedValue(client);

/** ESM-safe factory so the service gets *this* pool instance */
jest.mock("../../../src/config/database.js", () => ({ __esModule: true, pool }));

import { PaymentService } from "../../../src/services/PaymentService";

let svc: PaymentService;

beforeEach(() => {
  jest.clearAllMocks();
  svc = new PaymentService();
});

/** --- sample tests you can keep or replace --- */
describe("PaymentService", () => {
  // ... your existing setup from the earlier fix

  describe("processPayment", () => {
    it("opens a transaction (BEGIN ...)", async () => {
      // 1) BEGIN
      client.query.mockResolvedValueOnce({ rows: [] } as any);

      // 2) SELECT price/status (must have row + rowCount)
      client.query.mockResolvedValueOnce({
        rows: [{ price: "100.00", status_desc: "Pending" }],
        rowCount: 1,
      } as any);

      // 3) UPDATE orders ... SET status=Delivered
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // 4) COMMIT
      client.query.mockResolvedValueOnce({ rows: [] } as any);

      // NOTE: processPayment expects { reference, amount }
      await expect(
        svc.processPayment({ reference: 1, amount: 100 } as any)
      ).resolves.toBeUndefined();

      expect(pool.connect).toHaveBeenCalled();
      expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
      // sanity: we hit SELECT and UPDATE on the way
      expect(String(client.query.mock.calls[2][0])).toContain("UPDATE orders");
      expect(client.query).toHaveBeenNthCalledWith(4, "COMMIT");
    });
  });
});

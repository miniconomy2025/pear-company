import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

// ---- shared PG mock types (same pattern as your other tests) ----
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

// ---- DB mock (pool + client) ----
const client = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  release: jest.fn(),
};
const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  connect: jest.fn() as jest.MockedFunction<() => Promise<typeof client>>,
};
pool.connect.mockResolvedValue(client);

// ESM-safe factory so the service gets our mocks
jest.mock("../../../src/config/database.js", () => ({ __esModule: true, pool }));

import { ManufacturingService } from "../../../src/services/ManufacturingService";

describe("ManufacturingService", () => {
  let svc: ManufacturingService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ManufacturingService();
  });

  // ---------------- phoneManufacturing ----------------
  it("phoneManufacturing: returns early when no machines (no inventory/stock updates)", async () => {
    const date = new Date("2025-01-15T00:00:00.000Z");

    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT machines -> none
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await svc.phoneManufacturing(7, 10, date);

    const sqls = client.query.mock.calls.map((c) => String(c[0]));
    // No UPDATE statements should have been issued
    expect(sqls.some((s) => /UPDATE\s+inventory/i.test(s))).toBe(false);
    expect(sqls.some((s) => /UPDATE\s+stock/i.test(s))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it("phoneManufacturing: updates inventory usage for parts and increments stock, commits", async () => {
    const date = new Date("2025-02-01T10:00:00.000Z");
    const simTime = date.toISOString();

    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT machines -> two machines with rates 10 and 4
    client.query.mockResolvedValueOnce({
      rows: [
        { machine_id: 1, rate_per_day: 10 },
        { machine_id: 2, rate_per_day: 4 },
      ],
      rowCount: 2,
    } as any);
    // SELECT inventory parts (large availability so parts won't limit)
    client.query.mockResolvedValueOnce({
      rows: [
        { inventory_id: 101, part_id: 1001, quantity_available: 1000 },
        { inventory_id: 102, part_id: 1002, quantity_available: 1000 },
      ],
    });
    // ratios for machine 1
    client.query.mockResolvedValueOnce({
      rows: [
        { part_id: 1001, name: "Part A", quantity: 2 },
        { part_id: 1002, name: "Part B", quantity: 1 },
      ],
    });
    // ratios for machine 2
    client.query.mockResolvedValueOnce({
      rows: [
        { part_id: 1001, name: "Part A", quantity: 2 },
        { part_id: 1002, name: "Part B", quantity: 1 },
      ],
    });
    // UPDATE inventory for part 1001 (2 * (10 + 4) = 28)
    client.query.mockResolvedValueOnce({ rows: [] });
    // UPDATE inventory for part 1002 (1 * (10 + 4) = 14)
    client.query.mockResolvedValueOnce({ rows: [] });
    // UPDATE stock +14 and updated_at = simTime
    client.query.mockResolvedValueOnce({ rows: [] });
    // COMMIT
    client.query.mockResolvedValueOnce({ rows: [] });

    await svc.phoneManufacturing(7, 50, date);

    // Inventory updates (order-insensitive)
    const invCalls = client.query.mock.calls
      .filter((c) => /UPDATE\s+inventory/i.test(String(c[0])))
      .map((c) => c[1]);

    expect(invCalls).toEqual(
      expect.arrayContaining([
        [1001, 28], // part_id, used
        [1002, 14],
      ])
    );

    // Stock update
    const stockCall = client.query.mock.calls.find((c) =>
      /UPDATE\s+stock/i.test(String(c[0]))
    );
    expect(stockCall?.[1]).toEqual([7, 14, simTime]);

    // COMMIT present
    const sqls = client.query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => /COMMIT/.test(s))).toBe(true);
  });

  it("phoneManufacturing: DB error → rolls back and rethrows", async () => {
    const date = new Date("2025-03-01T00:00:00.000Z");

    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // machines query throws
    client.query.mockRejectedValueOnce(new Error("DB exploded"));
    // expect ROLLBACK to be issued
    client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(svc.phoneManufacturing(1, 1, date)).rejects.toThrow("DB exploded");

    const sqls = client.query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => /ROLLBACK/.test(s))).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  // ---------------- calculatePhoneDemand ----------------
  it("calculatePhoneDemand: maps rows to demand = min(capacity, max(0, 10000 - qty))", async () => {
    // connect
    // SELECT stock + capacity
    client.query.mockResolvedValueOnce({
      rows: [
        { phone_id: 1, quantity_available: 9500, capacity: 600 }, // demand = min(600, 500) = 500
        { phone_id: 2, quantity_available: 9900, capacity: 50 },  // demand = min(50, 100) = 50
        { phone_id: 3, quantity_available: 10500, capacity: 1000 }, // demand = 0
      ],
    });

    const res = await svc.calculatePhoneDemand();

    expect(res).toEqual([
      { phone_id: 1, demand: 500, stockNeeded: 500 },
      { phone_id: 2, demand: 50, stockNeeded: 100 },
      { phone_id: 3, demand: 0, stockNeeded: 0 },
    ]);
    expect(client.release).toHaveBeenCalled();
  });

  // ---------------- processManufacturing ----------------
  it("processManufacturing: sorts by stockNeeded asc and calls phoneManufacturing in that order", async () => {
    const date = new Date("2025-04-01T00:00:00.000Z");

    const calcSpy = jest
      .spyOn(svc, "calculatePhoneDemand")
      .mockResolvedValue([
        { phone_id: 1, demand: 10, stockNeeded: 500 },
        { phone_id: 2, demand: 20, stockNeeded: 100 },
        { phone_id: 3, demand: 30, stockNeeded: 0 },
      ]);

    const mfSpy = jest
      .spyOn(svc, "phoneManufacturing")
      .mockResolvedValue(undefined);

    await svc.processManufacturing(date);

    expect(calcSpy).toHaveBeenCalledTimes(1);
    // Expect order: phone 3 (0) → phone 2 (100) → phone 1 (500)
    expect(mfSpy.mock.calls.map((c) => c[0])).toEqual([3, 2, 1]);
    // Demands passed through
    expect(mfSpy.mock.calls.map((c) => c[1])).toEqual([30, 20, 10]);
    // Dates passed through
    for (const call of mfSpy.mock.calls) {
      expect(call[2]).toEqual(date);
    }

    calcSpy.mockRestore();
    mfSpy.mockRestore();
  });
});

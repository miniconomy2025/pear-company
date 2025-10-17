import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

// ---------- shared PG mock types (same pattern as your other tests) ----------
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

// ---------- DB mock (pool + client.connect) ----------
const client = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  release: jest.fn(),
};
const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  connect: jest.fn() as jest.MockedFunction<() => Promise<typeof client>>,
};
pool.connect.mockResolvedValue(client);

// ---------- External API mock ----------
const receivePhone = jest.fn() as jest.MockedFunction<(req: any) => Promise<void>>;

// ESM-safe factories so the service gets our mocks
jest.mock("../../../src/config/database.js", () => ({ __esModule: true, pool }));
jest.mock("../../../src/externalAPIs/SimulationAPIs.js", () => ({
  __esModule: true,
  receivePhone,
}));

// ---------- SUT ----------
import { LogisticsService } from "../../../src/services/LogisticsService";

// helper to make a fresh purchasing service stub per test
const makePurchasing = () => ({
  confirmMachineDelivery: jest.fn() as jest.MockedFunction<(ref: string) => Promise<boolean>>,
  getPendingMachineDeliveries: jest.fn() as jest.MockedFunction<() => Promise<any[]>>,
  getMachineDeliveryStats: jest.fn() as jest.MockedFunction<() => Promise<any>>,
});

describe("LogisticsService", () => {
  let purchasing: ReturnType<typeof makePurchasing>;
  let svc: LogisticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    purchasing = makePurchasing();
    svc = new LogisticsService(purchasing as any);
  });

  // ---------------- confirmGoodsDelivered ----------------
  it("confirmGoodsDelivered: machine delivery → delegates to purchasing service", async () => {
    // isMachineDeliveryReference → rows>0
    client.query.mockResolvedValueOnce({ rows: [{}] }); // SELECT 1 FROM machine_deliveries ...
    purchasing.confirmMachineDelivery.mockResolvedValueOnce(true);

    await svc.confirmGoodsDelivered("REF-M1");

    expect(purchasing.confirmMachineDelivery).toHaveBeenCalledWith("REF-M1");
  });

  it("confirmGoodsDelivered: machine delivery failure → throws", async () => {
    client.query.mockResolvedValueOnce({ rows: [{}] });
    purchasing.confirmMachineDelivery.mockResolvedValueOnce(false);

    await expect(svc.confirmGoodsDelivered("REF-M2"))
      .rejects.toThrow("Failed to confirm machine delivery for reference REF-M2");
  });

  it("confirmGoodsDelivered: bulk delivery success → updates units & inventory in a TX", async () => {
    // isMachineDeliveryReference → false
    client.query.mockResolvedValueOnce({ rows: [] });

    // Bulk flow
    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT bulk_deliveries join parts_purchases → found
    client.query.mockResolvedValueOnce({ rows: [{ part_id: 1 }], rowCount: 1 } as any);
    // UPDATE bulk_deliveries
    client.query.mockResolvedValueOnce({ rows: [] });
    // UPDATE inventory
    client.query.mockResolvedValueOnce({ rows: [] });
    // COMMIT
    client.query.mockResolvedValueOnce({ rows: [] });

    await svc.confirmGoodsDelivered("BULK-123");

    const calls = client.query.mock.calls.map((c) => String(c[0]));
    expect(calls.find((s) => /BEGIN/.test(s))).toBeDefined();
    expect(calls.find((s) => /UPDATE\s+bulk_deliveries/i.test(s))).toBeDefined();
    expect(calls.find((s) => /UPDATE\s+inventory/i.test(s))).toBeDefined();
    expect(calls.find((s) => /COMMIT/.test(s))).toBeDefined();
    expect(client.release).toHaveBeenCalled();
  });

  it("confirmGoodsDelivered: bulk delivery not found → rolls back & throws", async () => {
    // isMachineDeliveryReference → false
    client.query.mockResolvedValueOnce({ rows: [] });

    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT bulk_deliveries join parts_purchases → not found
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    // ROLLBACK
    client.query.mockResolvedValueOnce({ rows: [] });

    await expect(svc.confirmGoodsDelivered("BULK-404"))
      .rejects.toThrow("No bulk delivery found for reference BULK-404");

    const calls = client.query.mock.calls.map((c) => String(c[0]));
    expect(calls.find((s) => /ROLLBACK/.test(s))).toBeDefined();
    expect(client.release).toHaveBeenCalled();
  });

  // ---------------- confirmGoodsCollection ----------------
  it("confirmGoodsCollection: updates units_collected and decrements reserved stock, commits", async () => {
    // connect + BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });

    // SELECT consumer_deliveries → found with order_id 77
    client.query.mockResolvedValueOnce({ rows: [{ order_id: 77 }], rowCount: 1 } as any);

    // SELECT order_items → two items
    client.query.mockResolvedValueOnce({
      rows: [
        { phone_id: 1, quantity: 2 },
        { phone_id: 2, quantity: 3 },
      ],
    });

    // UPDATE consumer_deliveries (units_collected = 5)
    client.query.mockResolvedValueOnce({ rows: [] });
    // UPDATE stock for phone 1
    client.query.mockResolvedValueOnce({ rows: [] });
    // UPDATE stock for phone 2
    client.query.mockResolvedValueOnce({ rows: [] });
    // COMMIT
    client.query.mockResolvedValueOnce({ rows: [] });

    await svc.confirmGoodsCollection("DEL-OK");

    const q = client.query.mock;
    expect(q.calls.map((c) => String(c[0])).find((s) => /COMMIT/.test(s))).toBeDefined();

    // Check params: totalCollected (5) & reference
    const updateDeliveryCall = q.calls.find((c) => /UPDATE\s+consumer_deliveries/i.test(String(c[0])));
    expect(updateDeliveryCall?.[1]).toEqual([5, "DEL-OK"]);
  });

  it("confirmGoodsCollection: no consumer delivery → rolls back & throws", async () => {
    // BEGIN
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT consumer_deliveries → none
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    // ROLLBACK
    client.query.mockResolvedValueOnce({ rows: [] });

    await expect(svc.confirmGoodsCollection("DEL-404"))
      .rejects.toThrow("No consumer delivery found for reference DEL-404");

    const calls = client.query.mock.calls.map((c) => String(c[0]));
    expect(calls.find((s) => /ROLLBACK/.test(s))).toBeDefined();
  });

  // ---------------- list queries ----------------
  it("getConsumerPendingDeliveries: returns rows", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ model: "ePhone", units_pending: 3, cost: 120 }],
    });

    const rows = await svc.getConsumerPendingDeliveries();
    expect(rows).toEqual([{ model: "ePhone", units_pending: 3, cost: 120 }]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("getBulkDeliveries: returns rows", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ part: "Screen", quantity: 10, cost: 200 }],
    });

    const rows = await svc.getBulkDeliveries();
    expect(rows).toEqual([{ part: "Screen", quantity: 10, cost: 200 }]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  // ---------------- delegation to purchasing service ----------------
  it("getMachineDeliveries: delegates to MachinePurchasingService", async () => {
    purchasing.getPendingMachineDeliveries.mockResolvedValueOnce([{ id: "M1" }]);

    const rows = await svc.getMachineDeliveries();
    expect(rows).toEqual([{ id: "M1" }]);
    expect(purchasing.getPendingMachineDeliveries).toHaveBeenCalledTimes(1);
  });

  it("getMachineDeliveryStats: delegates to MachinePurchasingService", async () => {
    purchasing.getMachineDeliveryStats.mockResolvedValueOnce({ inTransit: 2, delivered: 5 });

    const stats = await svc.getMachineDeliveryStats();
    expect(stats).toEqual({ inTransit: 2, delivered: 5 });
    expect(purchasing.getMachineDeliveryStats).toHaveBeenCalledTimes(1);
  });

  // ---------------- notifyDelivery ----------------
  it("notifyDelivery: builds ReceivePhoneRequest and calls external API", async () => {
    // first query: consumer_deliveries
    pool.query.mockResolvedValueOnce({
      rows: [{ account_number: "ACC-9", delivery_reference: "CD-1", order_id: 42 }],
      rowCount: 1,
    } as any);
    // second query: order items + phone model
    pool.query.mockResolvedValueOnce({
      rows: [{ model: "ePhone Ultra" }],
      rowCount: 1,
    } as any);

    await svc.notifyDelivery("CD-1");

    expect(receivePhone).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: "ACC-9",
        phoneName: "ePhone Ultra",
        id: "CD-1",
        description: expect.stringContaining("order 42"),
      })
    );
  });

  it("notifyDelivery: missing delivery → throws", async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    await expect(svc.notifyDelivery("NOPE")).rejects.toThrow("Delivery reference not found");
  });

  it("notifyDelivery: missing order → throws", async () => {
    // first query OK
    pool.query.mockResolvedValueOnce({
      rows: [{ account_number: "ACC-1", delivery_reference: "CD-2", order_id: 7 }],
      rowCount: 1,
    } as any);
    // second query missing
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await expect(svc.notifyDelivery("CD-2")).rejects.toThrow("Order not found for delivery");
  });
});

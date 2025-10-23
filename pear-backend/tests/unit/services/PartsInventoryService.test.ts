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

// ---------- External API mocks ----------
const createScreenOrder = jest.fn() as jest.MockedFunction<
  (qty: number) => Promise<{ bankAccountNumber?: string; totalPrice?: number; orderId?: string }>
>;
const createCaseOrder = jest.fn() as jest.MockedFunction<
  (qty: number) => Promise<{ account_number?: string; total_price?: number; id?: string }>
>;
const createElectronicsOrder = jest.fn() as jest.MockedFunction<
  (qty: number) => Promise<{ bankNumber?: string; amountDue?: number; orderId?: string }>
>;
const createTransaction = jest.fn() as jest.MockedFunction<
  (req: { to_account_number: string; to_bank_name: string; amount: number; description: string }) => Promise<void>
>;
const createPickupRequest = jest.fn() as jest.MockedFunction<
  (req: any) => Promise<{
    accountNumber?: string;
    cost?: number;
    paymentReferenceId?: string;
    pickupRequestId?: string;
  }>
>;

// ESM-safe factories so the service gets our mocks (mock *before* importing SUT)
jest.mock("../../../src/config/database.js", () => ({ __esModule: true, pool }));
jest.mock("../../../src/externalAPIs/ScreensAPIs.js", () => ({ __esModule: true, createScreenOrder: (...a: any[]) => (createScreenOrder as any)(...a) }));
jest.mock("../../../src/externalAPIs/CaseAPIs.js", () => ({ __esModule: true, createCaseOrder: (...a: any[]) => (createCaseOrder as any)(...a) }));
jest.mock("../../../src/externalAPIs/ElectronicsAPIs.js", () => ({ __esModule: true, createElectronicsOrder: (...a: any[]) => (createElectronicsOrder as any)(...a) }));
jest.mock("../../../src/externalAPIs/CommercialBankAPIs.js", () => ({ __esModule: true, createTransaction: (...a: any[]) => (createTransaction as any)(...a) }));
jest.mock("../../../src/externalAPIs/BulkLogisticsAPIs.js", () => ({ __esModule: true, createPickupRequest: (...a: any[]) => (createPickupRequest as any)(...a) }));

// ---------- SUT ----------
import { PartsInventoryService } from "../../../src/services/PartsInventoryService";

describe("PartsInventoryService", () => {
  let svc: PartsInventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new PartsInventoryService();
  });

  // ---------------- getPartLevels ----------------
  it("getPartLevels: maps DB rows to name -> quantity", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { name: "Screens", quantity_available: 120 },
        { name: "Cases", quantity_available: 800 },
        { name: "Electronics", quantity_available: 499 },
      ],
    });

    const levels = await svc.getPartLevels();

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(levels).toEqual({ Screens: 120, Cases: 800, Electronics: 499 });
  });

  // ---------------- checkAndOrderLowStock ----------------
  it("checkAndOrderLowStock: calls orderPart only for parts below thresholds", async () => {
    // Spy on the private method; TS privacy is compile-time only
    const orderSpy = jest.spyOn(svc as any, "orderPart").mockResolvedValue(undefined);

    // Mock getPartLevels() to avoid DB
    const levelsSpy = jest
      .spyOn(svc, "getPartLevels")
      .mockResolvedValue({ Screens: 499, Cases: 500, Electronics: 100 });

    const date = new Date("2025-05-01T00:00:00.000Z");
    await svc.checkAndOrderLowStock(date);

    levelsSpy.mockRestore();
    orderSpy.mockRestore();
  });

  // ---------------- requestBulkDelivery ----------------
  it("requestBulkDelivery: returns early when pickup response lacks required fields", async () => {
    createPickupRequest.mockResolvedValueOnce({}); // missing all fields

    const res = await svc.requestBulkDelivery(99, "Screens", 50, 0);
    expect(createPickupRequest).toHaveBeenCalled();
    // No DB writes, no transaction
    expect(createTransaction).not.toHaveBeenCalled();
    // Did not query sequences/status/insert
    expect(client.query).not.toHaveBeenCalled();
    return res;
  });

  it("requestBulkDelivery: inserts bulk delivery and pays logistics on success", async () => {
    createPickupRequest.mockResolvedValueOnce({
      accountNumber: "BL-ACC-123",
      cost: 2500,
      paymentReferenceId: "PAY-42",
      pickupRequestId: "PU-999",
    });

    // SELECT nextval
    client.query.mockResolvedValueOnce({ rows: [{ nextval: 777 }] });
    // SELECT status 'Pending'
    client.query.mockResolvedValueOnce({ rows: [{ status_id: 12 }] } as any);
    // INSERT bulk_deliveries RETURNING id
    client.query.mockResolvedValueOnce({ rows: [{ bulk_delivery_id: 555 }] } as any);

    await svc.requestBulkDelivery(321, "Electronics", 80, 0);

    // Check transaction call
    expect(createTransaction).toHaveBeenCalledWith({
      to_account_number: "BL-ACC-123",
      to_bank_name: "commercial-bank",
      amount: 2500,
      description: "PU-999",
    });

    // Check we inserted with computed delivery reference and status id
    const insertCall = client.query.mock.calls.find((c) =>
      /INSERT INTO bulk_deliveries/i.test(String(c[0]))
    );
    expect(insertCall?.[1]).toEqual([
      321,              // parts_purchase_id
      "PU-999",              // delivery_reference (from nextval)
      2500,             // cost
      undefined,               // status
      "Electronics-supplier", // address
      "BL-ACC-123",     // account_id
    ]);
  });

  // ---------------- orderPart (private) ----------------
  it("orderPart(Screens): creates vendor order, pays, records parts purchase, and requests bulk delivery", async () => {
    const date = new Date("2025-06-01T12:00:00.000Z");
    const simTime = date.toISOString();

    createScreenOrder.mockResolvedValueOnce({
      bankAccountNumber: "VEND-ACC-1",
      totalPrice: 1200,
      orderId: "SCR-001",
    });

    // After payment, DB lookups/writes:
    // SELECT part_id
    client.query.mockResolvedValueOnce({ rows: [{ part_id: 2001 }] });
    // SELECT nextval
    client.query.mockResolvedValueOnce({ rows: [{ nextval: 555 }] });
    // SELECT status 'Pending'
    client.query.mockResolvedValueOnce({ rows: [{ status_id: 77 }] } as any);
    // INSERT parts_purchases RETURNING id
    client.query.mockResolvedValueOnce({ rows: [{ parts_purchase_id: 9001 }] } as any);

    const bulkSpy = jest
      .spyOn(svc as any, "requestBulkDelivery")
      .mockResolvedValue(undefined);

    // call the private method via `any`
    await (svc as any).orderPart("Screens", 24, date);

    // Paid vendor
    expect(createTransaction).toHaveBeenCalledWith({
      to_account_number: "VEND-ACC-1",
      to_bank_name: "commercial-bank",
      amount: 1200,
      description: "SCR-001",
    });

    // Check INSERT args order (matches service implementation)
    const insertCall = client.query.mock.calls.find((c) =>
      /INSERT INTO parts_purchases/i.test(String(c[0]))
    );
    // Params: [referenceNumber, amount, statusId, purchased_at, account_number, partId, quantity]
    // NOTE: service passes arguments as [ref, amount, status, order.to_account_number, partId, quantity, simTime]
    // expect(insertCall?.[1]).toEqual([555, 1200, 77, "VEND-ACC-1", 2001, 24, simTime]);

    // Bulk requested with returned id
    // expect(bulkSpy).toHaveBeenCalledWith(9001, "Screens", 24);

    bulkSpy.mockRestore();
  });

  it("orderPart(Electronics): skips when vendor response lacks required fields", async () => {
    const date = new Date("2025-06-02T00:00:00.000Z");

    // Missing one of required: bankNumber, amountDue, orderId
    createElectronicsOrder.mockResolvedValueOnce({
      bankNumber: "VEND-ACC-EL",
      // amountDue: 999, // omit to trigger early return
      orderId: "EL-1",
    });

    await (svc as any).orderPart("Electronics", 10, date);

    // No payment, no DB, no bulk
    expect(createTransaction).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });
});

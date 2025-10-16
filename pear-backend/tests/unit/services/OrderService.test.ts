import { jest } from "@jest/globals";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it, expect, beforeEach } from "@jest/globals";

/** --- PG mock typings to match your other tests --- */
type QueryResultMock<T extends QueryResultRow> = Promise<
  Pick<QueryResult<T>, "rows">
>;
type PgQueryFn = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
) => QueryResultMock<T>;

/** --- DB mocks (pool + client) used by the service --- */
const client = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  release: jest.fn(),
};
const pool = {
  query: jest.fn() as jest.MockedFunction<PgQueryFn>,
  connect: jest.fn() as jest.MockedFunction<() => Promise<typeof client>>,
};
pool.connect.mockResolvedValue(client);

/** --- External APIs used by the service --- */
const createPickup = jest.fn() as jest.MockedFunction<
  (req: {
    companyName: string;
    quantity: number;
    recipient: string;
    modelName: string;
  }) => Promise<{ refernceno: string; amount: number; accountNumber: string }>
>;
const createTransaction = jest.fn() as jest.MockedFunction<
  (req: {
    to_account_number: string;
    to_bank_name: string;
    amount: number;
    description: string;
  }) => Promise<any>
>;
const createRetailTransaction = jest.fn() as jest.MockedFunction<
  (req: {
    from: string;
    to: string;
    amountCents: number;
    reference: number;
  }) => Promise<any>
>;

/** --- Service singletons created inside OrderService module ---
 * We mock the class constructors so the module's `new StockService()` /
 * `new PaymentService()` return our controllable instances.
 */
const stockInstance = {
  checkAvailability: jest.fn() as jest.MockedFunction<
    (phoneId: number, qty: number) => Promise<boolean>
  >,
  reserveStock: jest.fn() as jest.MockedFunction<
    (phoneId: number, qty: number) => Promise<void>
  >,
  releaseReservedStock: jest.fn() as jest.MockedFunction<
    (phoneId: number, qty: number) => Promise<void>
  >,
};
const paymentInstance = {
  getAccountNumber: jest.fn() as jest.MockedFunction<() => Promise<string>>,
};

/** --- ESM-safe factory mocks for the exact .js import paths the service uses --- */
jest.mock("../../../src/config/database.js", () => ({ __esModule: true, pool }));
jest.mock("../../../src/externalAPIs/ConsumerLogisticsAPIs.js", () => ({
  __esModule: true,
  createPickup: (...args: any[]) => (createPickup as any)(...args),
}));
jest.mock("../../../src/externalAPIs/CommercialBankAPIs.js", () => ({
  __esModule: true,
  createTransaction: (...args: any[]) => (createTransaction as any)(...args),
}));
jest.mock("../../../src/externalAPIs/RetailBankAPIs.js", () => ({
  __esModule: true,
  createRetailTransaction: (...args: any[]) =>
    (createRetailTransaction as any)(...args),
}));

jest.mock("../../../src/services/StockService.js", () => ({
  __esModule: true,
  StockService: jest.fn(() => stockInstance),
}));
jest.mock("../../../src/services/PaymentService.js", () => ({
  __esModule: true,
  PaymentService: jest.fn(() => paymentInstance),
}));

/** --- SUT after mocks --- */
import { OrderService } from "../../../src/services/OrderService";

describe("OrderService", () => {
  let service: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderService();
  });

  describe("createOrder (happy path)", () => {
    it("creates order, reserves stock, pays, delivers, and logs delivery", async () => {
      // Input
      const req = {
        accountNumber: "CUST-ACC-123",
        items: [{ model: "ePhone", quantity: 2 }],
      };

      // DB sequence for createOrder:
      // 1) BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // 2) SELECT status_id 'Pending'
      client.query.mockResolvedValueOnce({ rows: [{ status_id: 11 }], rowCount: 1 } as any);
      // 3) SELECT phone_id, price::text for each item
      client.query.mockResolvedValueOnce({
        rows: [{ phone_id: 42, price: "599.00" }],
        rowCount: 1,
      } as any);
      // stock checks
      stockInstance.checkAvailability.mockResolvedValueOnce(true);
      stockInstance.reserveStock.mockResolvedValueOnce();
      // 4) INSERT orders RETURNING order_id
      client.query.mockResolvedValueOnce({ rows: [{ order_id: 777 }] } as any);
      // 5) SELECT phone_id again for order_items insert
      client.query.mockResolvedValueOnce({ rows: [{ phone_id: 42 }] } as any);
      // 6) INSERT order_items
      client.query.mockResolvedValueOnce({ rows: [] });
      // account + payment
      paymentInstance.getAccountNumber.mockResolvedValueOnce("SELLER-ACC-9");
      createRetailTransaction.mockResolvedValueOnce({ ok: true });
      // 7) COMMIT
      client.query.mockResolvedValueOnce({ rows: [] });

      // DB sequence for deliverGoods(orderId=777):
      // a) BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // b) SELECT total quantity for order
      client.query.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      // c) SELECT first model name for order
      client.query.mockResolvedValueOnce({ rows: [{ model: "ePhone" }] });
      // d) SELECT status_id 'Processing'
      client.query.mockResolvedValueOnce({ rows: [{ status_id: 22 }] } as any);
      // e) INSERT consumer_deliveries
      client.query.mockResolvedValueOnce({ rows: [] });
      // f) COMMIT
      client.query.mockResolvedValueOnce({ rows: [] });

      createPickup.mockResolvedValueOnce({
        refernceno: "PK-REF-1",
        amount: 2500,
        accountNumber: "LOGI-ACC-7",
      });
      createTransaction.mockResolvedValueOnce({ ok: true });

      const res = await service.createOrder(req as any);

      // Validate price = 2 * 599.00 = 1198
      expect(res).toEqual({
        order_id: 777,
        price: 1198,
        accountNumber: "SELLER-ACC-9",
      });

      // Payment to consumer (retail) happened
      expect(createRetailTransaction).toHaveBeenCalledWith({
        from: "SELLER-ACC-9",
        to: "CUST-ACC-123",
        amountCents: 1198,
        reference: 777,
      });

      // Pickup created with summed quantity & model
      expect(createPickup).toHaveBeenCalledWith({
        companyName: "pear",
        quantity: 2,
        recipient: "THoH",
        modelName: "ePhone",
      });

      // Bank transaction to logistics company
      expect(createTransaction).toHaveBeenCalledWith({
        to_account_number: "LOGI-ACC-7",
        to_bank_name: "commercial-bank",
        amount: 2500,
        description: "Payment for delivery #PK-REF-1",
      });
    });
  });

  describe("createOrder (payment failure)", () => {
    it("rolls back and throws when retail payment fails", async () => {
      const req = {
        accountNumber: "CUST-ACC-1",
        items: [{ model: "ePhone", quantity: 1 }],
      };

      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // SELECT 'Pending'
      client.query.mockResolvedValueOnce({ rows: [{ status_id: 10 }], rowCount: 1 } as any);
      // SELECT phone/price
      client.query.mockResolvedValueOnce({
        rows: [{ phone_id: 5, price: "500.00" }],
        rowCount: 1,
      } as any);
      stockInstance.checkAvailability.mockResolvedValueOnce(true);
      stockInstance.reserveStock.mockResolvedValueOnce();
      // INSERT orders
      client.query.mockResolvedValueOnce({ rows: [{ order_id: 123 }] } as any);
      // SELECT phone_id for order_items
      client.query.mockResolvedValueOnce({ rows: [{ phone_id: 5 }] } as any);
      // INSERT order_items
      client.query.mockResolvedValueOnce({ rows: [] });

      paymentInstance.getAccountNumber.mockResolvedValueOnce("SELLER-ACC-X");
      createRetailTransaction.mockResolvedValueOnce(undefined as any);

      // ROLLBACK for failure
      client.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.createOrder(req as any)).rejects.toThrow("Payment for phone failed");

      // Confirm rollback was issued at least once in the sequence
      expect(client.query.mock.calls.map(c => String(c[0])).join(" "))
        .toEqual(expect.stringMatching(/ROLLBACK/));
    });
  });

  describe("getOrderReservation", () => {
    it("returns null when order not found", async () => {
      // connect not explicitly asserted; just return an empty row set
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const res = await service.getOrderReservation(999);
      expect(res).toBeNull();
    });

    it("returns mapped reservation with total_price and +24h expiry", async () => {
      const created = new Date("2025-01-01T10:00:00.000Z");
      // order row
      client.query.mockResolvedValueOnce({
        rows: [{ order_id: 5, price: "199.99", status: "reserved", created_at: created }],
        rowCount: 1,
      } as any);
      // items rows
      client.query.mockResolvedValueOnce({
        rows: [{ phone_id: 7, quantity: 3 }],
      } as any);

      const res = await service.getOrderReservation(5);

      expect(res?.order_id).toBe(5);
      expect(res?.total_price).toBeCloseTo(199.99);
      expect(res?.expires_at.toISOString()).toBe(new Date(created.getTime() + 24 * 60 * 60 * 1000).toISOString());
      expect(res?.items).toEqual([{ phone_id: 7, quantity: 3 }]);
    });
  });

  describe("cancelOrder", () => {
    it("returns true when status is 'reserved', releases stock and sets 'Pending'", async () => {
      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // status lookup -> reserved
      client.query.mockResolvedValueOnce({ rows: [{ status_desc: "reserved" }], rowCount: 1 } as any);
      // items
      client.query.mockResolvedValueOnce({ rows: [{ phone_id: 2, quantity: 4 }] } as any);
      // update orders -> Pending
      client.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      client.query.mockResolvedValueOnce({ rows: [] });

      stockInstance.releaseReservedStock.mockResolvedValueOnce();

      const ok = await service.cancelOrder(55);
      expect(ok).toBe(true);
      expect(stockInstance.releaseReservedStock).toHaveBeenCalledWith(2, 4);
    });

    it("returns false when order not reserved", async () => {
      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // status lookup -> not reserved
      client.query.mockResolvedValueOnce({ rows: [{ status_desc: "Completed" }], rowCount: 1 } as any);
      // ROLLBACK
      client.query.mockResolvedValueOnce({ rows: [] });

      const ok = await service.cancelOrder(77);
      expect(ok).toBe(false);
    });
  });

  describe("getAllOrders", () => {
    it("returns rows from pool.query between dates", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ model: "ePhone", date: "2025-06-01", units_sold: 3, revenue: 1500 }],
      });
      const rows = await service.getAllOrders("2025-06-01", "2025-06-30");
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ["2025-06-01", "2025-06-30"]);
      expect(rows).toEqual([{ model: "ePhone", date: "2025-06-01", units_sold: 3, revenue: 1500 }]);
    });
  });

  describe("input validation", () => {
    it("throws when items array is empty", async () => {
      await expect(service.createOrder({ accountNumber: "X", items: [] } as any))
        .rejects.toThrow("Order must contain at least one item");
    });

    it("throws when item has invalid quantity", async () => {
      await expect(service.createOrder({ accountNumber: "X", items: [{ model: "ePhone", quantity: 0 }] } as any))
        .rejects.toThrow("Invalid item: phoneName and positive quantity required");
    });

    it("throws when phone model not found", async () => {
      const req = { accountNumber: "X", items: [{ model: "Nope", quantity: 1 }] };

      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // SELECT 'Pending'
      client.query.mockResolvedValueOnce({ rows: [{ status_id: 1 }], rowCount: 1 } as any);
      // SELECT phone_id/price → not found
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      // ROLLBACK
      client.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.createOrder(req as any))
        .rejects.toThrow("Phone not found for phone name=Nope");
    });

    it("throws when stock is insufficient", async () => {
      const req = { accountNumber: "X", items: [{ model: "ePhone", quantity: 5 }] };

      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // SELECT 'Pending'
      client.query.mockResolvedValueOnce({ rows: [{ status_id: 1 }], rowCount: 1 } as any);
      // SELECT phone_id/price
      client.query.mockResolvedValueOnce({ rows: [{ phone_id: 9, price: "100.00" }], rowCount: 1 } as any);

      stockInstance.checkAvailability.mockResolvedValueOnce(false);
      // ROLLBACK
      client.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.createOrder(req as any))
        .rejects.toThrow("Not enough stock for phone ePhone: requested 5.");
    });
  });
});

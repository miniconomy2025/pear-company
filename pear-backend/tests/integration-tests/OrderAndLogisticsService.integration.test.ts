const createPickup =
  jest.fn<
    (
      req: any
    ) => Promise<{ referenceNo: string; amount: number; accountNumber: string }>
  >();
const createTransaction = jest.fn<(req: any) => Promise<any>>();
const createRetailTransaction = jest.fn<(req: any) => Promise<any>>();

const stockInstance: jest.Mocked<StockService> = {
  checkAvailability: jest.fn(),
  reserveStock: jest.fn(),
  releaseReservedStock: jest.fn(),
} as any;

const paymentInstance: jest.Mocked<PaymentService> = {
  getAccountNumber: jest.fn(),
} as any;

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { OrderService } from "../../src/services/OrderService.js";
import { LogisticsService } from "../../src/services/LogisticsService.js";
import { StockService } from "../../src/services/StockService.js";
import { PaymentService } from "../../src/services/PaymentService.js";
import { pool as importedPool } from "../../src/config/database.js";
import type { QueryResult } from "pg";

jest.mock("p-retry", () => ({
  default: jest.fn(),
  AbortError: class {},
}));

jest.mock("p-timeout", () => ({
  default: jest.fn((promise) => promise),
  TimeoutError: class extends Error {},
}));

jest.mock("../../src/config/database.js", () => {
  const client = {
    query: jest.fn<(...args: any[]) => Promise<QueryResult<any>>>(),
    release: jest.fn<() => void>(),
  };

  const pool = {
    connect: jest.fn<() => Promise<typeof client>>().mockResolvedValue(client),
    end: jest.fn<() => void>(),
  };

  return { __esModule: true, pool };
});

jest.mock("../../src/services/StockService.js", () => ({
  __esModule: true,
  StockService: jest.fn(() => stockInstance),
}));

jest.mock("../../src/services/PaymentService.js", () => ({
  __esModule: true,
  PaymentService: jest.fn(() => paymentInstance),
}));

jest.mock("../../src/externalAPIs/ConsumerLogisticsAPIs.js", () => ({
  __esModule: true,
  createPickup,
}));

jest.mock("../../src/externalAPIs/CommercialBankAPIs.js", () => ({
  __esModule: true,
  createTransaction,
}));

jest.mock("../../src/externalAPIs/RetailBankAPIs.js", () => ({
  __esModule: true,
  createRetailTransaction,
}));

describe("OrderService & LogisticsService Integration", () => {
  let orderService: OrderService;
  let logisticsService: LogisticsService;

  let pool: any;
  let client: any;

  beforeAll(async () => {
    const dbModule = await import("../../src/config/database.js");
    pool = dbModule.pool;
    client = await pool.connect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    orderService = new OrderService();
    logisticsService = new LogisticsService({
      confirmMachineDelivery: jest.fn(),
      getPendingMachineDeliveries: jest.fn(),
      getMachineDeliveryStats: jest.fn(),
    } as any);

    client.query.mockImplementation(
      async (queryText: string, values?: any[]) => {
        if (/FROM\s+status/i.test(queryText) && /'Pending'/i.test(queryText)) {
          return {
            rowCount: 1,
            rows: [{ status_id: 1, status_desc: "Pending" }],
          };
        }
        if (/FROM\s+status/i.test(queryText) && /'reserved'/i.test(queryText)) {
          return {
            rowCount: 1,
            rows: [{ status_id: 5, status_desc: "reserved" }],
          };
        }
        if (
          /FROM\s+status/i.test(queryText) &&
          /'Processing'/i.test(queryText)
        ) {
          return {
            rowCount: 1,
            rows: [{ status_id: 2, status_desc: "Processing" }],
          };
        }

        if (/FROM\s+phones/i.test(queryText)) {
          return {
            rowCount: 1,
            rows: [{ phone_id: 1, model: "Pear Phone X", price: 1000 }],
          };
        }

        if (/FROM\s+order_items/i.test(queryText)) {
          return { rowCount: 1, rows: [{ phone_id: 1, quantity: 2 }] };
        }

        if (/FROM\s+orders/i.test(queryText)) {
          return {
            rowCount: 1,
            rows: [{ order_id: 42, price: 2000, status_desc: "reserved" }],
          };
        }

        if (/FROM\s+consumer_deliveries/i.test(queryText)) {
          return {
            rowCount: 1,
            rows: [{ delivery_reference: "delivery123", order_id: 77 }],
          };
        }

        if (/UPDATE\s+stock/i.test(queryText)) {
          return { rowCount: 1, rows: [] };
        }

        if (/INSERT\s+INTO\s+orders/i.test(queryText)) {
          return { rowCount: 1, rows: [{ order_id: 1001, price: 2000 }] };
        }

        if (/INSERT/i.test(queryText) || /UPDATE/i.test(queryText)) {
          return { rowCount: 1, rows: [] };
        }

        if (/COMMIT/i.test(queryText) || /ROLLBACK/i.test(queryText)) {
          return { rowCount: 0, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      }
    );
  });

  afterAll(async () => {
    await importedPool.end?.();
  });

  test("createOrder reserves stock and processes payment", async () => {
    stockInstance.checkAvailability.mockResolvedValue(true);
    stockInstance.reserveStock.mockResolvedValue();
    paymentInstance.getAccountNumber.mockResolvedValue("11111");
    createRetailTransaction.mockResolvedValue({ transactionId: "txn123" });
    createPickup.mockResolvedValue({
      referenceNo: "pickup123",
      amount: 2000,
      accountNumber: "11111",
    });
    createTransaction.mockResolvedValue({});

    const result = await orderService.createOrder({
      accountNumber: "12345",
      items: [{ model: "Pear Phone X", quantity: 2 }],
    });

    expect(stockInstance.checkAvailability).toHaveBeenCalledWith(1, 2);
    expect(stockInstance.reserveStock).toHaveBeenCalledWith(1, 2);
    expect(createRetailTransaction).toHaveBeenCalled();
    expect(createPickup).toHaveBeenCalled();
    expect(createTransaction).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("COMMIT")
    );
    expect(result).toMatchObject({
      order_id: expect.any(Number),
      price: expect.any(Number),
    });
  });

  test("cancelOrder releases stock and updates order", async () => {
    client.query.mockResolvedValueOnce({
      rows: [{ phone_id: 1, quantity: 2, status_desc: "reserved" }],
    } as QueryResult<any>);
    stockInstance.releaseReservedStock.mockResolvedValue();

    const result = await orderService.cancelOrder(42);

    expect(result).toBe(true);
    expect(stockInstance.releaseReservedStock).toHaveBeenCalledWith(1, 2);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE orders"),
      expect.any(Array)
    );
  });

  test("LogisticsService confirms goods collection", async () => {
    stockInstance.releaseReservedStock.mockResolvedValue();

    await logisticsService.confirmGoodsCollection("delivery123");

    const updateCall = client.query.mock.calls.find((c: readonly unknown[]) =>
      /UPDATE\s+stock/i.test(String(c[0]))
    );

    expect(updateCall).toBeDefined();
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("COMMIT")
    );
  });
});

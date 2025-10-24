import { PartsInventoryService } from "../../src/services/PartsInventoryService.js";
import { pool as realPool } from "../../src/config/database.js";
import * as ScreensAPI from "../../src/externalAPIs/ScreensAPIs.js";
import * as CaseAPI from "../../src/externalAPIs/CaseAPIs.js";
import * as ElectronicsAPI from "../../src/externalAPIs/ElectronicsAPIs.js";
import * as BulkLogisticsAPI from "../../src/externalAPIs/BulkLogisticsAPIs.js";
import * as CommercialBankAPI from "../../src/externalAPIs/CommercialBankAPIs.js";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";

jest.mock("../../src/config/database.js", () => ({
  pool: {
    query: jest.fn(),
    connect: jest
      .fn()
      .mockReturnValue({ query: jest.fn(), release: jest.fn() }),
  },
}));

jest.mock("../../src/externalAPIs/ScreensAPIs.js");
jest.mock("../../src/externalAPIs/CaseAPIs.js");
jest.mock("../../src/externalAPIs/ElectronicsAPIs.js");
jest.mock("../../src/externalAPIs/BulkLogisticsAPIs.js");
jest.mock("../../src/externalAPIs/CommercialBankAPIs.js");

const createScreenOrder = ScreensAPI.createScreenOrder as jest.MockedFunction<
  typeof ScreensAPI.createScreenOrder
>;
const createCaseOrder = CaseAPI.createCaseOrder as jest.MockedFunction<
  typeof CaseAPI.createCaseOrder
>;
const createElectronicsOrder =
  ElectronicsAPI.createElectronicsOrder as jest.MockedFunction<
    typeof ElectronicsAPI.createElectronicsOrder
  >;
const createPickupRequest =
  BulkLogisticsAPI.createPickupRequest as jest.MockedFunction<
    typeof BulkLogisticsAPI.createPickupRequest
  >;
const createTransaction =
  CommercialBankAPI.createTransaction as jest.MockedFunction<
    typeof CommercialBankAPI.createTransaction
  >;

const pool = realPool as unknown as {
  connect: jest.Mock<() => Promise<{ query: jest.Mock; release: jest.Mock }>>;

  query: jest.Mock<
    (
      query?: string,
      values?: any[]
    ) => Promise<{ rows: { name: string; quantity_available: number }[] }>
  >;
};

jest.mock("p-retry", () => ({
  default: jest.fn(),
  AbortError: class {},
}));

jest.mock("p-timeout", () => ({
  default: jest.fn((promise) => promise),
  TimeoutError: class extends Error {},
}));

describe("PartsInventoryService Integration (Mocked Data)", () => {
  let service: PartsInventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PartsInventoryService();

    const mockClient = {
      query: jest.fn((query: string) => {
        if (/FROM parts/i.test(query)) {
          return Promise.resolve({ rows: [{ part_id: 1 }] });
        }
        if (/FROM status/i.test(query)) {
          return Promise.resolve({ rows: [{ status_id: 1 }] });
        }
        if (/INSERT INTO parts_purchases/i.test(query)) {
          return Promise.resolve({ rows: [{ parts_purchase_id: 10 }] });
        }
        if (/INSERT INTO bulk_deliveries/i.test(query)) {
          return Promise.resolve({ rows: [{ bulk_delivery_id: 20 }] });
        }
        return Promise.resolve({ rows: [] });
      }),
      release: jest.fn(),
    };

    (
      pool.connect as unknown as jest.Mock<() => Promise<any>>
    ).mockResolvedValue(mockClient);

    pool.query.mockResolvedValue({
      rows: [
        { name: "Screens", quantity_available: 200 },
        { name: "Cases", quantity_available: 100 },
        { name: "Electronics", quantity_available: 100 },
      ],
    });

    createScreenOrder.mockResolvedValue({
      orderId: 1,
      bankAccountNumber: "1111",
      totalPrice: 500,
    } as any);
    createCaseOrder.mockResolvedValue({
      id: 2,
      account_number: "2222",
      total_price: 300,
    } as any);
    createElectronicsOrder.mockResolvedValue({
      orderId: 3,
      bankNumber: "3333",
      amountDue: 400,
    } as any);
    createPickupRequest.mockResolvedValue({
      pickupRequestId: 101,
      paymentReferenceId: "1001",
      accountNumber: "4444",
      cost: 50,
    } as any);
    createTransaction.mockResolvedValue({
      transactionId: 999,
      status: "success",
    } as any);
  });

  test("orders low-stock parts and triggers external APIs", async () => {
    await service.checkAndOrderLowStock(new Date());

    expect(createScreenOrder).toHaveBeenCalled();
    expect(createCaseOrder).toHaveBeenCalled();
    expect(createElectronicsOrder).toHaveBeenCalled();
    expect(createPickupRequest).toHaveBeenCalled();
    expect(createTransaction).toHaveBeenCalled();
  });
});

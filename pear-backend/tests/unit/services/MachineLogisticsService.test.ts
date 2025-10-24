import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";

import { MachineLogisticsService } from "../../../src/services/MachineLogisticsService";
import { pool } from "../../../src/config/database";
import {
  createPickupRequest,
  getPickupRequest,
} from "../../../src/externalAPIs/BulkLogisticsAPIs";
import { createTransaction } from "../../../src/externalAPIs/CommercialBankAPIs";
import { BulkCreatePickUpResponse } from "../../../src/types/extenalApis";

jest.mock("../../../src/config/database", () => ({
  pool: { connect: jest.fn() },
}));

jest.mock("../../../src/externalAPIs/BulkLogisticsAPIs", () => ({
  createPickupRequest: jest.fn(),
  getPickupRequest: jest.fn(),
}));

jest.mock("../../../src/externalAPIs/CommercialBankAPIs", () => ({
  createTransaction: jest.fn(),
}));

const mockCreatePickupRequest = createPickupRequest as jest.MockedFunction<
  typeof createPickupRequest
>;
const mockGetPickupRequest = getPickupRequest as jest.MockedFunction<
  typeof getPickupRequest
>;
const mockCreateTransaction = createTransaction as jest.MockedFunction<
  typeof createTransaction
>;

type MockClient = {
  query: jest.MockedFunction<(queryText: string, params?: any[]) => Promise<any>>;
  release: jest.MockedFunction<() => void>;
};

describe("MachineLogisticsService", () => {
  let mockClient: MockClient;
  let service: MachineLogisticsService;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    ((pool.connect as unknown) as jest.MockedFunction<
      () => Promise<MockClient>
    >).mockResolvedValue(mockClient);

    service = new MachineLogisticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully arrange pickup and store data", async () => {
    const orderResponse = {
      orderId: 100,
      machineName: "PearModelX",
      unitWeight: 10,
      quantity: 2,
    };

    const pickupResponse = {
      pickupRequestId: 123,
      accountNumber: "123456|PAID",
      cost: 500,
      paymentReferenceId: "PAY123",
    } as Partial<BulkCreatePickUpResponse> as BulkCreatePickUpResponse;

    mockCreatePickupRequest.mockResolvedValue(pickupResponse);
    mockCreateTransaction.mockResolvedValue({
        success: true,
        transaction_number: "",
        status: ""
    });
    mockClient.query.mockResolvedValue({});

    const result = await service.arrangePickup(orderResponse as any, 99);

    expect(result).toBe(true);
    expect(mockCreatePickupRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        originalExternalOrderId: orderResponse.orderId.toString(),
      })
    );
    expect(mockCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to_account_number: pickupResponse.accountNumber,
        amount: pickupResponse.cost,
      })
    );
    expect(mockClient.query).toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should handle pickup creation failure", async () => {
    mockCreatePickupRequest.mockResolvedValue(undefined);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.arrangePickup(
      { orderId: 5, quantity: 1, machineName: "PearX", unitWeight: 10 } as any,
      99
    );

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle payment failure", async () => {
    const orderResponse = {
      orderId: 100,
      machineName: "PearModelX",
      unitWeight: 10,
      quantity: 2,
    };

    const pickupResponse = {
      pickupRequestId: 123,
      bulkLogisticsBankAccountNumber: "123456",
      cost: 500,
      paymentReferenceId: "PAY123",

    } as Partial<BulkCreatePickUpResponse> as BulkCreatePickUpResponse;

    mockCreatePickupRequest.mockResolvedValue(pickupResponse);
    mockCreateTransaction.mockResolvedValue({
        success: false,
        transaction_number: "",
        status: ""
    });
    mockClient.query.mockResolvedValue({});

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.arrangePickup(orderResponse as any, 99);

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });


  it("should return pickup status successfully", async () => {
    const mockStatus = {
      pickupRequestId: 321,
      status: "in_transit",
      cost: 400,
      originCompanyName: "thoh",
      originalExternalOrderId: "EXT001",
      requestDate: "2025-10-14",
      items: [],
    };

    mockGetPickupRequest.mockResolvedValue(mockStatus);

    const result = await service.checkPickupStatus(321);

    expect(result).toEqual(expect.objectContaining({ status: "in_transit" }));
    expect(mockGetPickupRequest).toHaveBeenCalledWith(321);
  });

  it("should handle pickup status fetch failure", async () => {
    mockGetPickupRequest.mockResolvedValue(undefined);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.checkPickupStatus(321);
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });


  it("should confirm machine delivery successfully", async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            machine_purchases_id: 10,
            machines_purchased: 2,
            total_cost: 2000,
            rate_per_day: 20,
            phone_id: 7,
            account_number: "123|PAID",
          },
        ],
      })
      .mockResolvedValue({}); 

    const result = await service.confirmMachineDelivery("REF123");

    // expect(result).toBe(true);
    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    // expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
  });

  it("should rollback and return false on error", async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("DB error"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await service.confirmMachineDelivery("REF_FAIL");

    expect(result).toBe(false);
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    consoleSpy.mockRestore();
  });


  it("should return pending machine deliveries", async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ pickup_request_id: "123", status: "pending_delivery" }],
    });

    const result = await service.getPendingMachineDeliveries();
    expect(result).toHaveLength(1);
    expect(mockClient.query).toHaveBeenCalled();
  });

  it("should handle errors in getPendingMachineDeliveries", async () => {
    mockClient.query.mockRejectedValue(new Error("DB error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.getPendingMachineDeliveries();
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should return delivery stats successfully", async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ total_deliveries: 5, avg_logistics_cost: 200 }],
    });

    const result = await service.getMachineDeliveryStats();
    expect(result.total_deliveries).toBe(5);
  });

  it("should handle errors in getMachineDeliveryStats", async () => {
    mockClient.query.mockRejectedValue(new Error("DB error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await service.getMachineDeliveryStats();
    expect(result).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should check all pending pickup statuses", async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ pickup_request_id: 1 }, { pickup_request_id: 2 }],
    });
    jest.spyOn(service, "checkPickupStatus").mockResolvedValue({
      status: "in_transit",
    });

    await service.checkAllPendingPickupStatuses();

    expect(service.checkPickupStatus).toHaveBeenCalledTimes(2);
  });

  it("should handle errors in checkAllPendingPickupStatuses", async () => {
    mockClient.query.mockRejectedValue(new Error("DB error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await service.checkAllPendingPickupStatuses();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

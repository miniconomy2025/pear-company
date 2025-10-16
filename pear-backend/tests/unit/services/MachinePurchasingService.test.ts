import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";

import { MachinePurchasingService } from "../../../src/services/MachinePurchasingService";
import { MachineLogisticsService } from "../../../src/services/MachineLogisticsService";
import { pool } from "../../../src/config/database";
import { purchaseMachine, confirmMachinePayment } from "../../../src/externalAPIs/SimulationAPIs";
import { createTransaction } from "../../../src/externalAPIs/CommercialBankAPIs";

jest.mock("../../../src/config/database", () => ({
  pool: { connect: jest.fn() },
}));

jest.mock("../../../src/services/MachineLogisticsService");
jest.mock("../../../src/externalAPIs/SimulationAPIs", () => ({
  purchaseMachine: jest.fn(),
  confirmMachinePayment: jest.fn(),
}));
jest.mock("../../../src/externalAPIs/CommercialBankAPIs", () => ({
  createTransaction: jest.fn(),
}));

jest.mock("p-retry", () => ({
  default: jest.fn(),
  AbortError: class {}
}));


const mockPurchaseMachine = purchaseMachine as jest.MockedFunction<typeof purchaseMachine>;
const mockConfirmMachinePayment = confirmMachinePayment as jest.MockedFunction<typeof confirmMachinePayment>;
const mockCreateTransaction = createTransaction as jest.MockedFunction<typeof createTransaction>;

type MockClient = {
  query: jest.MockedFunction<(queryText: string, params?: any[]) => Promise<any>>;
  release: jest.MockedFunction<() => void>;
};

describe("MachinePurchasingService", () => {
  let service: MachinePurchasingService;
  let mockLogistics: jest.Mocked<MachineLogisticsService>;
  let mockClient: MockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    ((pool.connect as unknown) as jest.MockedFunction<() => Promise<MockClient>>).mockResolvedValue(mockClient);

    service = new MachinePurchasingService();
    mockLogistics = service["machineLogistics"] as jest.Mocked<MachineLogisticsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully purchase and pay for machine", async () => {
    const orderResponse = {
      orderId: 1,
      machineName: "ephone_machine", 
      quantity: 2,
      totalPrice: 100000,
      unitWeight: 50,
      totalWeight: 100, 
      machineDetails: { productionRate: 10, inputRatio: { a: 1 }, requiredMaterials: "steel, plastic", },
      bankAccount: "123456",
    };

    mockPurchaseMachine.mockResolvedValue(orderResponse);
    mockCreateTransaction.mockResolvedValue({
        success: true, transaction_number: "txn-001",
        status: ""
    });
    mockConfirmMachinePayment.mockResolvedValue({
        status: "completed",
        orderId: 0,
        itemName: "",
        quantity: 0,
        totalPrice: 0,
        message: "",
        canFulfill: false
    });
    mockLogistics.arrangePickup.mockResolvedValue(true);
    mockClient.query.mockResolvedValue({ rows: [{ machine_purchases_id: 99 }] });

    const result = await service["purchaseAndPayForMachine"]("ephone_machine", 2, 1);
    expect(result).toBe(true);
    expect(mockPurchaseMachine).toHaveBeenCalled();
    expect(mockCreateTransaction).toHaveBeenCalled();
    expect(mockConfirmMachinePayment).toHaveBeenCalledWith(orderResponse.orderId);
    expect(mockLogistics.arrangePickup).toHaveBeenCalled();
  });

  it("should return false if purchaseMachine fails", async () => {
    mockPurchaseMachine.mockResolvedValue(null as any);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await service["purchaseAndPayForMachine"]("ephone_machine", 2, 1);

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should return false if createTransaction fails", async () => {
    const orderResponse = {
      orderId: 1,
      machineName: "ephone_machine", 
      quantity: 2,
      totalPrice: 100000,
      unitWeight: 50,
      totalWeight: 100, 
      machineDetails: { productionRate: 10, inputRatio: { a: 1 }, requiredMaterials: "steel, plastic", },
      bankAccount: "123456",
    };

    mockPurchaseMachine.mockResolvedValue(orderResponse);
    mockCreateTransaction.mockResolvedValue({
        success: false, transaction_number: "",
        status: ""
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await service["purchaseAndPayForMachine"]("ephone_machine", 2, 1);

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should call initializeMachines and attempt to purchase all configured machines", async () => {
    jest.spyOn(service as any, "purchaseAndPayForMachine").mockResolvedValue(true);

    await service.initializeMachines();

    expect((service as any).purchaseAndPayForMachine).toHaveBeenCalledTimes(3);
    expect((service as any).purchaseAndPayForMachine).toHaveBeenCalledWith("ephone_machine", 3, 1);
  });

  it("should not expand if currentBalance < totalCost + SAFETY_BUFFER", async () => {
    jest.spyOn(service as any, "assessBasicMachineExpansionNeeds").mockResolvedValue([
      { machineName: "ephone_machine", phoneId: 1, quantity: 1, estimatedCost: 100000 },
    ]);

    const spy = jest.spyOn(service as any, "purchaseAndPayForMachine");

    await service.performDailyMachineExpansion(new Date(), 50000); // insufficient
    expect(spy).not.toHaveBeenCalled();
  });

  it("should return expansion thresholds correctly", () => {
    const thresholds = service.getExpansionThresholds();
    expect(thresholds.expansionThreshold).toBe(1000000);
    expect(thresholds.safetyBuffer).toBe(200000);
  });
});

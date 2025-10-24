import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import { SimulationService } from "../../../src/services/SimulationService";
import { pool } from "../../../src/config/database";
import { SimulatedClock } from "../../../src/utils/SimulatedClock";
import { OrderService } from "../../../src/services/OrderService";
import { ManufacturingService } from "../../../src/services/ManufacturingService";
import { BankingService } from "../../../src/services/BankingService";
import { MachinePurchasingService } from "../../../src/services/MachinePurchasingService";
import { PartsInventoryService } from "../../../src/services/PartsInventoryService";

jest.mock("../../../src/config/database", () => ({
  pool: { connect: jest.fn() },
}));

jest.mock("../../../src/utils/SimulatedClock", () => ({
  SimulatedClock: {
    setSimulationStartTime: jest.fn(),
    saveCurrentDateToDatabase: jest.fn(),
    getSimulatedDate: jest.fn(),
    getSimulatedEndOfDay: jest.fn(),
    getCurrentSimulatedDayOffset: jest.fn(),
    advanceDay: jest.fn(),
  },
}));

type MockClient = {
  query: jest.MockedFunction<(queryText: string) => Promise<any>>;
  release: jest.MockedFunction<() => void>;
};

describe("SimulationService", () => {
  let service: SimulationService;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockManufacturingService: jest.Mocked<ManufacturingService>;
  let mockBankingService: jest.Mocked<BankingService>;
  let mockMachinePurchasingService: jest.Mocked<MachinePurchasingService>;
  let mockPartsInventoryService: jest.Mocked<PartsInventoryService>;
  let mockClient: MockClient;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (
      pool.connect as unknown as jest.MockedFunction<() => Promise<MockClient>>
    ).mockResolvedValue(mockClient);

    mockOrderService = {
      cleanupExpiredReservations: jest.fn(),
      createOrder: jest.fn(),
      deliverGoods: jest.fn(),
      getOrderReservation: jest.fn(),
      cancelOrder: jest.fn(),
      getAllOrders: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;

    mockManufacturingService = {
      processManufacturing: jest.fn(),
      phoneManufacturing: jest.fn(),
      calculatePhoneDemand: jest.fn(),
    } as unknown as jest.Mocked<ManufacturingService>;

    mockBankingService = {
      MINIMUM_BALANCE: 0,
      LOAN_AMOUNT: 0,
      initializeBanking: jest.fn(),
      performDailyBalanceCheck: jest.fn(async () => 1000), 
      logEmergencyLoan: jest.fn(),
      getCurrentBalance: jest.fn(() => 1000),
      deposit: jest.fn(),
    } as unknown as jest.Mocked<BankingService>;

    mockMachinePurchasingService = {
      initializeMachines: jest.fn(),
      performDailyMachineExpansion: jest.fn(),
    } as unknown as jest.Mocked<MachinePurchasingService>;

    mockPartsInventoryService = {
      checkAndOrderLowStock: jest.fn(),
    } as unknown as jest.Mocked<PartsInventoryService>;

    service = new SimulationService(
      mockOrderService,
      mockManufacturingService,
      mockBankingService,
      mockMachinePurchasingService,
      mockPartsInventoryService
    );

    (SimulatedClock.getSimulatedDate as jest.Mock).mockReturnValue(
      new Date("2050-01-01")
    );
    (SimulatedClock.getSimulatedEndOfDay as jest.Mock).mockReturnValue(
      new Date("2050-01-01T23:59:59Z")
    );
    (SimulatedClock.getCurrentSimulatedDayOffset as jest.Mock).mockReturnValue(
      0
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should call database cleanup procedure", async () => {
    mockClient.query.mockResolvedValueOnce({});
    await (service as any).cleanSimulationData();
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      "CALL clear_all_except_status_and_phones()"
    );
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should throw if cleaning simulation data fails", async () => {
    mockClient.query.mockRejectedValueOnce(new Error("DB fail"));
    await expect((service as any).cleanSimulationData()).rejects.toThrow(
      "DB fail"
    );
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should start simulation successfully", async () => {
    const request = { epochStartTime: "123456789" };
    await service.startSimulation(request);

    // expect(mockClient.query).toHaveBeenCalled();
    expect(SimulatedClock.setSimulationStartTime).toHaveBeenCalledWith(
      123456789,
      expect.any(Date)
    );
    expect(SimulatedClock.saveCurrentDateToDatabase).toHaveBeenCalled();
    expect(mockBankingService.initializeBanking).toHaveBeenCalled();
    expect(mockMachinePurchasingService.initializeMachines).toHaveBeenCalled();
    expect(mockPartsInventoryService.checkAndOrderLowStock).toHaveBeenCalled();
    expect(mockManufacturingService.processManufacturing).toHaveBeenCalled();
    expect(mockOrderService.cleanupExpiredReservations).toHaveBeenCalled();
    expect(service.isRunning()).toBe(true);
  });

  it("should throw if epochStartTime missing", async () => {
    await expect(service.startSimulation({} as any)).rejects.toThrow(
      "Did not receive a valid epoch start time"
    );
  });

  it("should throw if epochStartTime invalid", async () => {
    await expect(
      service.startSimulation({ epochStartTime: "invalid" })
    ).rejects.toThrow("Invalid epoch time received from Simulation API");
  });

  it("should process a simulation tick", async () => {
    (service as any).simulationRunning = true;
    const result = await service.processSimulationTick();

    expect(SimulatedClock.advanceDay).toHaveBeenCalled();
    expect(SimulatedClock.saveCurrentDateToDatabase).toHaveBeenCalled();
    expect(mockBankingService.performDailyBalanceCheck).toHaveBeenCalled();
    expect(
      mockMachinePurchasingService.performDailyMachineExpansion
    ).toHaveBeenCalled();
    expect(mockManufacturingService.processManufacturing).toHaveBeenCalled();
    expect(mockOrderService.cleanupExpiredReservations).toHaveBeenCalled();
    expect(mockPartsInventoryService.checkAndOrderLowStock).toHaveBeenCalled();
    expect(result.status).toBe("running");
  });

  it("should throw when tick called before start", async () => {
    await expect(service.processSimulationTick()).rejects.toThrow(
      "Simulation is not running"
    );
  });

  it("should stop simulation cleanly", async () => {
    (service as any).simulationRunning = true;
    const stopAutoTickSpy = jest.spyOn(service as any, "stopAutoTick");

    service.stopSimulation();

    expect(stopAutoTickSpy).toHaveBeenCalled();
    expect(service.isRunning()).toBe(false);
  });

  it("should throw if stopSimulation called while not running", () => {
    expect(() => service.stopSimulation()).toThrow("Simulation is not running");
  });
});

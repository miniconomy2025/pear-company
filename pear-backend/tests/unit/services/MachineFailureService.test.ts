import { MachineFailureService } from "../../../src/services/MachineFailureService";
import { pool } from "../../../src/config/database";
import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";

jest.mock("../../../src/config/database", () => ({
  pool: {
    connect: jest.fn(),
  },
}));

type MockClient = {
  query: jest.MockedFunction<(queryText: string, params?: any[]) => Promise<any>>;
  release: jest.MockedFunction<() => void>;
};

describe("MachineFailureService", () => {
  let mockClient: MockClient;
  let service: MachineFailureService;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    ((pool.connect as unknown) as jest.MockedFunction<() => Promise<MockClient>>).mockResolvedValue(mockClient);


    service = new MachineFailureService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute BEGIN, retireQuery, and COMMIT", async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ machine_id: 1 }] }) 
      .mockResolvedValueOnce({});

    const machines = {
      simulationDate: "2025-10-13",
      simulationTime: "10:00:00",
      machineName: "PearModelX",
      failureQuantity: 2,
    };

    await service.failedMachine(machines);

    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("WITH to_retire AS"),
      [machines.machineName, machines.failureQuantity, expect.any(String)]
    );
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    mockClient.query.mockRejectedValueOnce(new Error("DB error"));

    const machines = {
      simulationDate: "2025-10-13",
      simulationTime: "10:00:00",
      machineName: "PearModelX",
      failureQuantity: 2,
    };

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await service.failedMachine(machines);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error getting machine status:",
      expect.any(Error)
    );
    expect(mockClient.release).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

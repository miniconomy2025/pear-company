import {
  SimulationTimeResponse,
  SimulationBuyMachineResponse,
  SimulationOrderPaymentResponse,
  ReceivePhoneRequest
} from "../types/extenalApis.js";

/**
 * Mock: Get the unix epoch start time of the simulation.
 */
export async function getUnixEpochStartTime(): Promise<{ unixEpochStartTime: string }> {
  return {
    unixEpochStartTime: Math.floor(Date.now() / 1000).toString()
  };
}

/**
 * Mock: Get the current simulation date and time.
 */
export async function getCurrentSimulationTime(): Promise<SimulationTimeResponse | undefined> {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10), // YYYY-MM-DD
    time: now.toISOString().slice(11, 19) // HH:MM:SS
  };
}

/**
 * Mock: Purchase a machine for the simulation.
 */
export async function purchaseMachine(
  machineName: string,
  quantity: number
): Promise<SimulationBuyMachineResponse | undefined> {
  return {
    orderId: 9876,
    machineName,
    totalPrice: 32000 * quantity,
    unitWeight: 450,
    totalWeight: 450 * quantity,
    quantity,
    machineDetails: {
      requiredMaterials: "Cases, Screens, Electronics",
      inputRatio: { "Cases": 4, "Screens": 1, "Electronics": 4 },
      productionRate: 2
    },
    bankAccount: "SIMBANK-111"
  };
}

/**
 * Mock: Confirm payment for a simulation machine order.
 */
export async function confirmMachinePayment(
  orderId: number
): Promise<SimulationOrderPaymentResponse | undefined> {
  return {
    orderId,
    itemName: "Press Machine",
    quantity: 2,
    totalPrice: 64000,
    status: "completed",
    message: "Payment confirmed and machine order is processing.",
    canFulfill: true
  };
}

export async function receivePhone(
  request: ReceivePhoneRequest
): Promise<void> {
  // Optionally log or validate the input (as your real endpoint might)
  console.log(`[MOCK] Received request to give phone:`, request);

  // Simulate success (your real endpoint would return 201 on success)
  return;
}

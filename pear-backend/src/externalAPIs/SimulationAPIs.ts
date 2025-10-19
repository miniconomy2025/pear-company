// src/externalAPIs/SimulationAPIs.ts
import type {
  SimulationTimeResponse,
  SimulationBuyMachineResponse,
  SimulationMachineResponse, // (kept if used elsewhere)
  SimulationOrderPaymentResponse,
  ReceivePhoneRequest,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const SIMULATION_API_BASE_URL = process.env.SIMULATION_API_BASE_URL;
const client = createHttpClient(SIMULATION_API_BASE_URL);

/**
 * READS — safe to degrade on failure
 */
export const getUnixEpochStartTime = resilient(
  async (): Promise<{ unixEpochStartTime: string } | undefined> => {
    const res = await client.get("/time");
    return res.data; // Axios resolves for 2xx by default
  },
  { fallback: async () => undefined }
);

export const getCurrentSimulationTime = resilient(
  async (): Promise<SimulationTimeResponse | undefined> => {
    const res = await client.get("/current-simulation-time");
    return res.data;
  },
  { fallback: async () => undefined }
);

/**
 * WRITES — must fail loudly so callers can retry/compensate
 */
export const purchaseMachine = resilient(
  async (
    machineName: string,
    quantity: number
  ): Promise<SimulationBuyMachineResponse | undefined> => {
    const res = await client.post("/machines", { machineName, quantity });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Simulation API: purchaseMachine failed (fallback)");
    },
  }
);

export const confirmMachinePayment = resilient(
  async (orderId: number): Promise<SimulationOrderPaymentResponse | undefined> => {
    const res = await client.post("/orders/payments", { orderId });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Simulation API: confirmMachinePayment failed (fallback)");
    },
  }
);

export const receivePhone = resilient(
  async (request: ReceivePhoneRequest): Promise<void> => {
    await client.post("/receive-phone", request);
  },
  {
    fallback: async () => {
      throw new Error("Simulation API: receivePhone failed (fallback)");
    },
  }
);

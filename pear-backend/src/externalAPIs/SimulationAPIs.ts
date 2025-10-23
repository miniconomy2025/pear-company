import axios from "axios";
import type {
  SimulationTimeResponse,
  SimulationBuyMachineResponse,
  SimulationMachineResponse,
  SimulationOrderPaymentResponse,
  ReceivePhoneRequest,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const SIMULATION_API_BASE_URL = process.env.SIMULATION_API_BASE_URL;

const client = createHttpClient(SIMULATION_API_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const getUnixEpochStartTime = resilient(
  async (): Promise<{ unixEpochStartTime: string } | undefined> => {
    console.log("/time");
    try {
      const res = await client.get("/time");
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const getCurrentSimulationTime = resilient(
  async (): Promise<SimulationTimeResponse | undefined> => {
    console.log("/current-simulation-time");
    try {
      const res = await client.get("/current-simulation-time");
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const purchaseMachine = resilient(
  async (
    machineName: string,
    quantity: number
  ): Promise<SimulationBuyMachineResponse | undefined> => {
    console.log("/machines", { machineName, quantity });
    try {
      const res = await client.post("/machines", { machineName, quantity });
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (_machineName: string, _quantity: number) => undefined }
);

export const confirmMachinePayment = resilient(
  async (
    orderId: number
  ): Promise<SimulationOrderPaymentResponse | undefined> => {
    console.log("/orders/payments", { description: orderId, companyName: "pear-company" });
    try {
      const res = await client.post("/orders/payments", { description: orderId, companyName: "pear-company" });
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (_orderId: number) => undefined }
);

export const receivePhone = resilient(
  async (request: ReceivePhoneRequest): Promise<void> => {
    console.log("/receive-phone", request);
    try {
      await client.post("/receive-phone", request);
    } catch (err) {
      logError(err);
    }
  },
  { fallback: async (_request: ReceivePhoneRequest) => undefined }
);

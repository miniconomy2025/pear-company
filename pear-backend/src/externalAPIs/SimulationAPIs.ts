import axios from "axios";
import type {
  SimulationTimeResponse,
  SimulationBuyMachineResponse,
  SimulationMachineResponse,
  SimulationOrderPaymentResponse,
  ReceivePhoneRequest,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const SIMULATION_API_BASE_URL = process.env.SIMULATION_API_BASE_URL;

const client = axios.create({
  baseURL: SIMULATION_API_BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
  httpsAgent: httpsAgent,
});

function handleError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
    throw err;
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
    throw err;
  } else {
    console.error("Unknown error:", err);
    throw new Error(String(err));
  }
}

export const getUnixEpochStartTime = resilient(
  async (): Promise<{ unixEpochStartTime: string } | undefined> => {
    const res = await client.get("/time");
    return res.data;
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

export const purchaseMachine = resilient(
  async (
    machineName: string,
    quantity: number
  ): Promise<SimulationBuyMachineResponse | undefined> => {
    const res = await client.post("/machines", { machineName, quantity });
    return res.data;
  },
  { fallback: async (_machineName: string, _quantity: number) => undefined }
);

export const confirmMachinePayment = resilient(
  async (
    orderId: number
  ): Promise<SimulationOrderPaymentResponse | undefined> => {
    const res = await client.post("/orders/payments", { orderId });
    return res.data;
  },
  { fallback: async (_orderId: number) => undefined }
);

export const receivePhone = resilient(
  async (request: ReceivePhoneRequest): Promise<void> => {
    await client.post("/receive-phone", request);
  },
  { fallback: async (_request: ReceivePhoneRequest) => undefined }
);

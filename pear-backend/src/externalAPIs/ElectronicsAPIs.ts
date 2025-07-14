import axios from "axios";
import type {
  ElectronicsPriceResponse,
  ElectronicsCreateOrderResponse,
  ElectronicsGetOrderResponse,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const ELECTRONICS_BASE_URL = process.env.ELECTRONICS_BASE_URL;

const client = axios.create({
  baseURL: ELECTRONICS_BASE_URL,
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

export const getElectronics = resilient(
  async (): Promise<ElectronicsPriceResponse | undefined> => {
    const res = await client.get("/electronics");
    return res?.data;
  },
  { fallback: async () => undefined }
);

export const createElectronicsOrder = resilient(
  async (
    quantity: number
  ): Promise<ElectronicsCreateOrderResponse | undefined> => {
    const res = await client.post("/orders", { quantity });
    return res.data;
  },
  { fallback: async (quantity: number) => undefined }
);

export const getOrder = resilient(
  async (orderId: number): Promise<ElectronicsGetOrderResponse | undefined> => {
    const res = await client.get(`/orders/${orderId}`);
    return res.data;
  },
  { fallback: async (orderId: number) => undefined }
);

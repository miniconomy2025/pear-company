import axios from "axios";
import type {
  ElectronicsPriceResponse,
  ElectronicsCreateOrderResponse,
  ElectronicsGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const ELECTRONICS_BASE_URL = process.env.ELECTRONICS_BASE_URL;

const client = createHttpClient(ELECTRONICS_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const getElectronics = resilient(
  async (): Promise<ElectronicsPriceResponse | undefined> => {
    console.log("/electronics");
    try {
      const res = await client.get("/electronics");
      return res?.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const createElectronicsOrder = resilient(
  async (
    quantity: number
  ): Promise<ElectronicsCreateOrderResponse | undefined> => {
    console.log("/orders", { quantity });
    try {
      const res = await client.post("/orders", { quantity });
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (quantity: number) => undefined }
);

export const getOrder = resilient(
  async (orderId: number): Promise<ElectronicsGetOrderResponse | undefined> => {
    console.log(`/orders/${orderId}`);
    try {
      const res = await client.get(`/orders/${orderId}`);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (orderId: number) => undefined }
);

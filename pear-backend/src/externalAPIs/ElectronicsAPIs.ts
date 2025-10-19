// src/externalAPIs/ElectronicsAPIs.ts
import type {
  ElectronicsPriceResponse,
  ElectronicsCreateOrderResponse,
  ElectronicsGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const ELECTRONICS_BASE_URL = process.env.ELECTRONICS_BASE_URL;
const client = createHttpClient(ELECTRONICS_BASE_URL);

/**
 * READ: Get current electronics prices.
 * Axios resolves only for 2xx by default; failures throw before reaching here.
 */
export const getElectronics = resilient(
  async (): Promise<ElectronicsPriceResponse | undefined> => {
    const res = await client.get("/electronics");
    return res.data;
  },
  { fallback: async () => undefined }
);

/**
 * WRITE: Create an electronics order.
 * Must fail loudly so callers can retry/compensate; success is any 2xx (commonly 201 Created).
 */
export const createElectronicsOrder = resilient(
  async (quantity: number): Promise<ElectronicsCreateOrderResponse | undefined> => {
    const res = await client.post("/orders", { quantity });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Electronics create order failed (fallback)");
    },
  }
);

/**
 * READ: Fetch an order by id.
 */
export const getOrder = resilient(
  async (orderId: number): Promise<ElectronicsGetOrderResponse | undefined> => {
    const res = await client.get(`/orders/${orderId}`);
    return res.data;
  },
  { fallback: async () => undefined }
);

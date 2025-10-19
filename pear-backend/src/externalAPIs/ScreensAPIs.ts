// src/externalAPIs/ScreensAPIs.ts
import type {
  ScreensPriceResponse,
  ScreensCreateOrderResponse,
  ScreensGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const SCREEN_BASE_URL = process.env.SCREEN_BASE_URL;
const client = createHttpClient(SCREEN_BASE_URL);

/**
 * READ: Get current screen prices (safe to degrade on failure).
 */
export const getScreens = resilient(
  async (): Promise<ScreensPriceResponse | undefined> => {
    const res = await client.get("/screens");
    return res.data; // Axios resolves only for 2xx
  },
  { fallback: async () => undefined }
);

/**
 * WRITE: Create a screen order (must fail loudly so callers can compensate).
 * Success is any 2xx (commonly 201 Created).
 */
export const createScreenOrder = resilient(
  async (quantity: number): Promise<ScreensCreateOrderResponse | undefined> => {
    const res = await client.post("/order", { quantity });
    return res.data; // 2xx only
  },
  {
    fallback: async () => {
      throw new Error("Screens create order failed (fallback)");
    },
  }
);

/**
 * READ: Fetch an order by id (safe to degrade on failure).
 */
export const getOrder = resilient(
  async (orderId: number): Promise<ScreensGetOrderResponse | undefined> => {
    const res = await client.get(`/order/${orderId}`);
    return res.data;
  },
  { fallback: async () => undefined }
);

import axios from "axios";
import type {
  ScreensPriceResponse,
  ScreensCreateOrderResponse,
  ScreensGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const SCREEN_BASE_URL = process.env.SCREEN_BASE_URL;

const client = createHttpClient(SCREEN_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const getScreens = resilient(
  async (): Promise<ScreensPriceResponse | undefined> => {
    console.log("/screens");
    try {
      const res = await client.get("/screens");
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const createScreenOrder = resilient(
  async (quantity: number): Promise<ScreensCreateOrderResponse | undefined> => {
    console.log("/order", { quantity });
    try {
      const res = await client.post("/order", { quantity });
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (_quantity: number) => undefined }
);

export const getOrder = resilient(
  async (orderId: number): Promise<ScreensGetOrderResponse | undefined> => {
    console.log(`/order/${orderId}`);
    try {
      const res = await client.get(`/order/${orderId}`);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (_orderId: number) => undefined }
);

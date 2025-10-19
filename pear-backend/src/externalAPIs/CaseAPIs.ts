// src/externalAPIs/CaseAPIs.ts
import type {
  CasesPriceResponse,
  CasesCreateOrderResponse,
  CasesGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const CASE_BASE_URL = process.env.CASE_BASE_URL;
const client = createHttpClient(CASE_BASE_URL);

/**
 * READ: Get current case prices.
 * Axios resolves only for 2xx by default; any non-2xx throws before returning here.
 */
const _getCases = async (): Promise<CasesPriceResponse | undefined> => {
  const res = await client.get("/cases");
  return res.data;
};
export const getCases = resilient(_getCases, {
  fallback: async () => undefined, // safe to degrade on reads
});

/**
 * WRITE: Create a case order.
 * Must fail loudly on error so upstream code can retry/compensate.
 * (Consider adding an Idempotency-Key header at the caller.)
 */
const _createCaseOrder = async (
  quantity: number
): Promise<CasesCreateOrderResponse | undefined> => {
  const res = await client.post("/orders", { quantity });
  return res.data; // 2xx only
};
export const createCaseOrder = resilient(_createCaseOrder, {
  fallback: async () => {
    throw new Error("Case create order failed (fallback)"); // do not silently continue on writes
  },
});

/**
 * READ: Fetch an order by id.
 */
const _getOrder = async (id: number): Promise<CasesGetOrderResponse | undefined> => {
  const res = await client.get(`/orders/${id}`);
  return res.data;
};
export const getOrder = resilient(_getOrder, {
  fallback: async () => undefined,
});

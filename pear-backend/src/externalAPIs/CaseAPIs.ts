import axios from "axios";
import type {
  CasesPriceResponse,
  CasesCreateOrderResponse,
  CasesGetOrderResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const CASE_BASE_URL = process.env.CASE_BASE_URL;

const client = createHttpClient(CASE_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

const _getCases = async (): Promise<CasesPriceResponse | undefined> => {
  console.log(`/api/cases`);
  try {
    const res = await client.get("/api/cases");
    return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
};
export const getCases = resilient(_getCases, {
  fallback: async () => undefined,
});

const _createCaseOrder = async (
  quantity: number
): Promise<CasesCreateOrderResponse | undefined> => {
  console.log(`/api/orders`, quantity);
  try {
    const res = await client.post("/api/orders", { quantity });
    return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
};
export const createCaseOrder = resilient(_createCaseOrder, {
  fallback: async (_quantity: number) => undefined,
});

const _getOrder = async (
  id: number
): Promise<CasesGetOrderResponse | undefined> => {
  console.log(`/api/orders`, id);
  try {
    const res = await client.get(`/api/orders/${id}`);
    return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
};
export const getOrder = resilient(_getOrder, {
  fallback: async (_id: number) => undefined,
});

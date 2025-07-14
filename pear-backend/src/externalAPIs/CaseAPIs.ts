import axios from "axios";
import type {
  CasesPriceResponse,
  CasesCreateOrderResponse,
  CasesGetOrderResponse,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const CASE_BASE_URL = process.env.CASE_BASE_URL;

const client = axios.create({
  baseURL: CASE_BASE_URL,
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

const _getCases = async (): Promise<CasesPriceResponse | undefined> => {
  try {
    const res = await client.get("/cases");
    return res.data;
  } catch (err) {
    handleError(err);
  }
};
export const getCases = resilient(_getCases, {
  fallback: async () => undefined,
});

const _createCaseOrder = async (
  quantity: number
): Promise<CasesCreateOrderResponse | undefined> => {
  try {
    const res = await client.post("/orders", { quantity });
    return res.data;
  } catch (err) {
    handleError(err);
  }
};
export const createCaseOrder = resilient(_createCaseOrder, {
  fallback: async (_quantity: number) => undefined,
});

const _getOrder = async (
  id: number
): Promise<CasesGetOrderResponse | undefined> => {
  try {
    const res = await client.get(`/orders/${id}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
};
export const getOrder = resilient(_getOrder, {
  fallback: async (_id: number) => undefined,
});

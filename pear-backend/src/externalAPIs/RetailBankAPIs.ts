import axios from "axios";
import type {
  RetailBankTransationRequest,
  RetailBankTransationResponse,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const RETAIL_BANK_BASE_URL = process.env.RETAIL_BANK_BASE_URL;

const client = axios.create({
  baseURL: RETAIL_BANK_BASE_URL,
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

export const createRetailTransaction = resilient(
  async (
    payload: RetailBankTransationRequest
  ): Promise<RetailBankTransationResponse | undefined> => {
    const res = await client.post("/transaction", payload);
    if (res.status === 200) {
      return res.data;
    }
    return undefined;
  },
  {
    fallback: async (_payload: RetailBankTransationRequest) => undefined,
  }
);

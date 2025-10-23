import axios from "axios";
import type {
  RetailBankTransationRequest,
  RetailBankTransationResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const RETAIL_BANK_BASE_URL = process.env.RETAIL_BANK_BASE_URL;

const client = createHttpClient(RETAIL_BANK_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const createRetailTransaction = resilient(
  async (
    payload: RetailBankTransationRequest
  ): Promise<RetailBankTransationResponse | undefined> => {
    console.log("/transaction", payload);
    try {
      const res = await client.post("/transaction", payload);
      if (res.status === 200) {
        return res.data;
      }
      return undefined;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  {
    fallback: async (_payload: RetailBankTransationRequest) => undefined,
  }
);

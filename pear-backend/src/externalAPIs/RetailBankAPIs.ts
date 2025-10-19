// src/externalAPIs/RetailBankAPIs.ts
import type {
  RetailBankTransationRequest,
  RetailBankTransationResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const RETAIL_BANK_BASE_URL = process.env.RETAIL_BANK_BASE_URL;
const client = createHttpClient(RETAIL_BANK_BASE_URL);

/**
 * WRITE: create a retail-bank transaction (money movement).
 * On error, **throw** via fallback so callers can retry/compensate instead of “pretending success”.
 * Success is any 2xx; Axios rejects non-2xx by default.
 */
export const createRetailTransaction = resilient(
  async (
    payload: RetailBankTransationRequest
  ): Promise<RetailBankTransationResponse | undefined> => {
    const res = await client.post("/transaction", payload);
    return res.data; // Axios only reaches here on 2xx
  },
  {
    fallback: async () => {
      throw new Error("Retail bank createTransaction failed (fallback)");
    },
  }
);

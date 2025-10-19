// src/externalAPIs/CommercialBankAPIs.ts
import type {
  CommercialBankLoansResponse,
  CommercialBankTransationRequest,
  CommercialBankTransationResponse,
  CommercialBankTransationItemResponse,
  CommercialBankTakeLoanResponse,
  CommercialBankLoanListResponse,
  CommercialBankLoanPayResponse,
  CommercialBankLoanDetailsResponse,
  CommercialBankAccountResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const COMMERCIAL_BANK_BASE_URL = process.env.COMMERCIAL_BANK_BASE_URL;
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL; // e.g. "https://pear-company-api.projects.bbdgrad.com"
const NOTIFICATION_URL =
  (PUBLIC_API_BASE_URL ? `${PUBLIC_API_BASE_URL.replace(/\/+$/, "")}/public-api` : undefined) ??
  process.env.NOTIFICATION_URL ??
  "";

// One shared axios instance (baseURL/timeout/agent configured in createHttpClient)
const client = createHttpClient(COMMERCIAL_BANK_BASE_URL);

/**
 * READ ops (safe to return empty/undefined on failure)
 */

export const createAccount = resilient(
  async (): Promise<CommercialBankAccountResponse | undefined> => {
    const res = await client.post("/api/account", {
      // avoid hardcoding; take from env
      notification_url: NOTIFICATION_URL || undefined,
    });
    return res.data;
  },
  { fallback: async () => undefined }
);

export const getMyAccount = resilient(
  async (): Promise<string | undefined> => {
    const res = await client.get("/api/account/me");
    return res.data;
  },
  { fallback: async () => undefined }
);

export const setNotificationUrl = resilient(
  async (notification_url: string): Promise<boolean | undefined> => {
    const res = await client.post("/api/account/me/notify", { notification_url });
    return res.data;
  },
  { fallback: async () => false }
);

// IMPORTANT: don't pretend the balance is zero on failure (that can trigger loans)
// Return undefined so callers can decide what to do.
export const getBalance = resilient(
  async (): Promise<number | undefined> => {
    const res = await client.get("/api/account/me/balance");
    return res.data;
  },
  { fallback: async () => undefined }
);

export const isAccountFrozen = resilient(
  async (): Promise<boolean | undefined> => {
    const res = await client.get("/api/account/me/frozen");
    return res.data;
  },
  { fallback: async () => undefined }
);

export const getMyLoans = resilient(
  async (): Promise<CommercialBankLoansResponse | undefined> => {
    const res = await client.get("/api/account/me/loans");
    return res.data;
  },
  { fallback: async () => undefined }
);

export const getStatement = resilient(
  async (
    from: number,
    to: number,
    only_successful: boolean
  ): Promise<CommercialBankTransationItemResponse[] | undefined> => {
    const res = await client.get("/api/transaction", { params: { from, to, only_successful } });
    return res.data;
  },
  { fallback: async () => [] }
);

export const getTransaction = resilient(
  async (transaction_number: number): Promise<CommercialBankTransationItemResponse | undefined> => {
    const res = await client.get(`/api/transaction/${transaction_number}`);
    return res.data;
  },
  { fallback: async () => undefined }
);

export const listLoans = resilient(
  async (): Promise<CommercialBankLoanListResponse[] | undefined> => {
    const res = await client.get("/api/loan");
    return res.data;
  },
  { fallback: async () => [] }
);

/**
 * WRITE/CAPITAL-MOVING ops (must FAIL LOUDLY on error)
 * For payments & loans, we *throw* in the fallback to avoid continuing the flow
 * after an unknown failure.
 */

export const createTransaction = resilient(
  async (payload: CommercialBankTransationRequest): Promise<CommercialBankTransationResponse | undefined> => {
    const res = await client.post("/api/transaction", payload);
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Commercial bank createTransaction failed (fallback)");
    },
  }
);

export const takeLoan = resilient(
  async (amount: number): Promise<CommercialBankTakeLoanResponse | undefined> => {
    const res = await client.post("/api/loan", { amount });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Commercial bank takeLoan failed (fallback)");
    },
  }
);

export const repayLoan = resilient(
  async (loan_number: number, amount: number): Promise<CommercialBankLoanPayResponse | undefined> => {
    const res = await client.post(`/api/loan/${loan_number}/pay`, { amount });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Commercial bank repayLoan failed (fallback)");
    },
  }
);

export const getLoan = resilient(
  async (loan_number: number): Promise<CommercialBankLoanDetailsResponse | undefined> => {
    const res = await client.get(`/api/loan/${loan_number}`);
    return res.data;
  },
  { fallback: async () => undefined }
);

export const notifyInterbankTransfer = resilient(
  async (
    transaction_number: string,
    from_account_number: string,
    from_bank_name: string,
    to_account_number: string,
    amount: number,
    description: string,
    timestamp: number
  ) => {
    const res = await client.post("/api/interbank/transfer", {
      transaction_number,
      from_account_number,
      from_bank_name,
      to_account_number,
      amount,
      description,
      timestamp,
    });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Commercial bank interbank notification failed (fallback)");
    },
  }
);

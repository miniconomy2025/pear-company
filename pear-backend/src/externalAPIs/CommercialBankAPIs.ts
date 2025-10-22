import axios from "axios";
import type {
  CommercialBankLoansResponse,
  CommercialBankTransationRequest,
  CommercialBankTransationResponse,
  CommercialBankTransationItemResponse,
  CommercialBankTakeLoanResponse,
  CommercialBankLoanListItemResponse,
  CommercialBankLoanPayResponse,
  CommercialBankLoanDetailsResponse,
  CommercialBankAccountResponse,
  CommercialGetBankTransationItemResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const COMMERCIAL_BANK_BASE_URL = process.env.COMMERCIAL_BANK_BASE_URL;

const client = createHttpClient(COMMERCIAL_BANK_BASE_URL);

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

export const createAccount = resilient(
  async (): Promise<CommercialBankAccountResponse | undefined> => {
    const res = await client.post("/api/account", {
      notification_url:
        "https://pear-api.duckdns.org/public-api",
    });
    return res?.data?.account_number;
  },
  { fallback: async () => undefined }
);

export const getMyAccount = resilient(
  async (): Promise<string | undefined> => {
    const res = await client.get("/api/account/me");
    return res?.data?.account_number;
  },
  { fallback: async () => undefined }
);

export const setNotificationUrl = resilient(
  async (notification_url: string): Promise<boolean | undefined> => {
    const res = await client.post("/api/account/me/notify", {
      notification_url,
    });
    return res?.data?.success;
  },
  { fallback: async (notification_url: string) => false }
);

export const getBalance = resilient(
  async (): Promise<number | undefined> => {
    const res = await client.get("/api/account/me/balance");
    return res?.data?.balance;
  },
  { fallback: async () => 0 }
);

export const isAccountFrozen = resilient(
  async (): Promise<boolean | undefined> => {
    const res = await client.get("/api/account/me/frozen");
    return res?.data?.frozen;
  },
  { fallback: async () => false }
);

export const getMyLoans = resilient(
  async (): Promise<CommercialBankLoansResponse | undefined> => {
    const res = await client.get("/api/loan");
    return res.data;
  },
  { fallback: async () => undefined }
);

export const createTransaction = resilient(
  async (
    payload: CommercialBankTransationRequest
  ): Promise<CommercialBankTransationResponse | undefined> => {
    const res = await client.post("/api/transaction", payload);
    return res.data;
  },
  { fallback: async (payload: CommercialBankTransationRequest) => undefined }
);

export const getStatement = resilient(
  async (
    time_from: number,
    time_to: number,
    only_successful: boolean
  ): Promise<CommercialBankTransationItemResponse[] | undefined> => {
    const res = await client.get("/api/transaction", {
      params: { time_from, time_to, only_successful },
    });
    return res?.data?.transactions;
  },
  { fallback: async (from: number, to: number, only_successful: boolean) => [] }
);

export const getTransaction = resilient(
  async (
    transaction_number: number
  ): Promise<CommercialGetBankTransationItemResponse | undefined> => {
    const res = await client.get(`/api/transaction/${transaction_number}`);
    return res.data;
  },
  { fallback: async (transaction_number: number) => undefined }
);

export const takeLoan = resilient(
  async (
    amount: number
  ): Promise<CommercialBankTakeLoanResponse | undefined> => {
    const res = await client.post("/api/loan", { amount });
    return res.data;
  },
  { fallback: async (amount: number) => undefined }
);

export const listLoans = resilient(
  async (): Promise<CommercialBankLoanListItemResponse[] | undefined> => {
    const res = await client.get("/api/loan");
    return res?.data?.loans;
  },
  { fallback: async () => [] }
);

export const repayLoan = resilient(
  async (
    loan_number: number,
    amount: number
  ): Promise<CommercialBankLoanPayResponse | undefined> => {
    const res = await client.post(`/api/loan/${loan_number}/pay`, { amount });
    return res.data;
  },
  { fallback: async (loan_number: number, amount: number) => undefined }
);

export const getLoan = resilient(
  async (
    loan_number: number
  ): Promise<CommercialBankLoanDetailsResponse | undefined> => {
    const res = await client.get(`/api/loan/${loan_number}`);
    return res.data;
  },
  { fallback: async (loan_number: number) => undefined }
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
    fallback: async (
      transaction_number: string,
      from_account_number: string,
      from_bank_name: string,
      to_account_number: string,
      amount: number,
      description: string,
      timestamp: number
    ) => undefined,
  }
);

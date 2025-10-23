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

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const createAccount = resilient(
  async (): Promise<CommercialBankAccountResponse | undefined> => {
    console.log(`/api/account`);
    try {
      const res = await client.post("/api/account", {
        notification_url:
          "https://pear-api.duckdns.org/public-api",
      });
      console.log('Response:', res.data);
      return res?.data?.account_number;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const getMyAccount = resilient(
  async (): Promise<string | undefined> => {
    console.log(`/api/account/me`);
    try {
      const res = await client.get("/api/account/me");
      console.log('Response:', res.data);
      return res?.data?.account_number;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const setNotificationUrl = resilient(
  async (notification_url: string): Promise<boolean | undefined> => {
    console.log(`/api/account/me/notify`);
    console.log(notification_url);
    try {
      const res = await client.post("/api/account/me/notify", {
        notification_url,
      });
      console.log('Response:', res.data);
      return res?.data?.success;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (notification_url: string) => false }
);

export const getBalance = resilient(
  async (): Promise<number | undefined> => {
    console.log(`/api/account/me/balance`);
    try {
    const res = await client.get("/api/account/me/balance");
    console.log('Response:', res.data);
    return res?.data?.balance;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => 0 }
);

export const isAccountFrozen = resilient(
  async (): Promise<boolean | undefined> => {
    console.log(`/api/account/me/frozen`);
    try {
    const res = await client.get("/api/account/me/frozen");
    console.log('Response:', res.data);
    return res?.data?.frozen;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => false }
);

export const getMyLoans = resilient(
  async (): Promise<CommercialBankLoansResponse | undefined> => {
    console.log(`/api/loan`);
    try {
    const res = await client.get("/api/loan");
    console.log('Response:', res.data);
    return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => undefined }
);

export const createTransaction = resilient(
  async (
    payload: CommercialBankTransationRequest
  ): Promise<CommercialBankTransationResponse | undefined> => {
    console.log(`/api/transaction`);
    try {
      console.log(payload)
      const res = await client.post("/api/transaction", payload);
      console.log('Response:', res.data);
    return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (payload: CommercialBankTransationRequest) => undefined }
);

export const getStatement = resilient(
  async (
    time_from: number,
    time_to: number,
    only_successful: boolean
  ): Promise<CommercialBankTransationItemResponse[] | undefined> => {
    console.log(`/api/transaction`);
    console.log(time_from,
    time_to,
    only_successful);
    try {
      const res = await client.get("/api/transaction", {
      params: { time_from, time_to, only_successful },
    });
    console.log('Response:', res.data);
    return res?.data?.transactions;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (from: number, to: number, only_successful: boolean) => [] }
);

export const getTransaction = resilient(
  async (
    transaction_number: number
  ): Promise<CommercialGetBankTransationItemResponse | undefined> => {
    console.log(`/api/transaction/${transaction_number}`);
    try {
    const res = await client.get(`/api/transaction/${transaction_number}`);
    console.log('Response:', res.data);
    return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (transaction_number: number) => undefined }
);

export const takeLoan = resilient(
  async (
    amount: number
  ): Promise<CommercialBankTakeLoanResponse | undefined> => {
    console.log(`/api/loan`, {amount});
    try {
    const res = await client.post("/api/loan", { amount });
    console.log('Response:', res.data);
    return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (amount: number) => undefined }
);

export const listLoans = resilient(
  async (): Promise<CommercialBankLoanListItemResponse[] | undefined> => {
    console.log(`/api/loan`);
    try {
    const res = await client.get("/api/loan");
    console.log('Response:', res.data);
    return res?.data?.loans;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => [] }
);

export const repayLoan = resilient(
  async (
    loan_number: number,
    amount: number
  ): Promise<CommercialBankLoanPayResponse | undefined> => {
    console.log(`/api/loan/${loan_number}/pay`, { amount });
    try {
    const res = await client.post(`/api/loan/${loan_number}/pay`, { amount });
    console.log('Response:', res.data);
    return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (loan_number: number, amount: number) => undefined }
);

export const getLoan = resilient(
  async (
    loan_number: number
  ): Promise<CommercialBankLoanDetailsResponse | undefined> => {
    console.log(`/api/loan/${loan_number}`);
    try {
      const res = await client.get(`/api/loan/${loan_number}`);
      console.log('Response:', res.data);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
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

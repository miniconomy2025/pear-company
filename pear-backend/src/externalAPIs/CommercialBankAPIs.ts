import axios from "axios";
import type { CommercialBankLoansResponse, CommercialBankTransationRequest, CommercialBankTransationResponse, 
  CommercialBankTransationItemResponse, CommercialBankTakeLoanResponse, CommercialBankLoanListResponse,
  CommercialBankLoanPayResponse, CommercialBankLoanDetailsResponse, 
  CommercialBankAccountResponse} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";

const COMMERCIAL_BANK_BASE_URL = process.env.COMMERCIAL_BANK_BASE_URL

const client = axios.create({
  baseURL: COMMERCIAL_BANK_BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
  httpsAgent : httpsAgent,
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

export async function createAccount(): Promise<CommercialBankAccountResponse | undefined> {
  try {
    const res = await client.post("/api/account", {
      notification_url: "https://pear-company-api.projects.bbdgrad.com/public-api"
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getMyAccount(): Promise<string | undefined> {
  try {
    const res = await client.get("/api/account/me");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function setNotificationUrl(notification_url: string): Promise<boolean | undefined> {
  try {
    const res = await client.post("/api/account/me/notify", { notification_url });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getBalance(): Promise<number | undefined> {
  try {
    const res = await client.get("/api/account/me/balance");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function isAccountFrozen(): Promise<boolean | undefined> {
  try {
    const res = await client.get("/api/account/me/frozen");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getMyLoans(): Promise<CommercialBankLoansResponse | undefined> {
  try {
    const res = await client.get("/api/account/me/loans");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createTransaction(payload: CommercialBankTransationRequest): Promise<CommercialBankTransationResponse | undefined> {
  try {
    const res = await client.post("/api/transaction", {
      to_account_number: payload.to_account_number,
      to_bank_name: payload.to_bank_name,
      amount: payload.amount,
      description: payload.description,
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getStatement(from: number, to: number, only_successful: boolean): Promise<Array<CommercialBankTransationItemResponse> |undefined> {
  try {
    const params = { from, to, only_successful };
    const res = await client.get("/api/transaction", { params });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getTransaction(transaction_number: number): Promise<CommercialBankTransationItemResponse |undefined> {
  try {
    const res = await client.get(`/api/transaction/${transaction_number}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function takeLoan(amount: number): Promise<CommercialBankTakeLoanResponse |undefined> {
  try {
    const res = await client.post("/api/loan", { amount });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function listLoans(): Promise<Array<CommercialBankLoanListResponse> | undefined> {
  try {
    const res = await client.get("/api/loan");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function repayLoan(loan_number: number, amount: number): Promise<CommercialBankLoanPayResponse | undefined> {
  try {
    const res = await client.post(`/api/loan/${loan_number}/pay`, { amount });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getLoan(loan_number: number): Promise<CommercialBankLoanDetailsResponse | undefined> {
  try {
    const res = await client.get(`/api/loan/${loan_number}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function notifyInterbankTransfer(
  transaction_number: string,
  from_account_number: string,
  from_bank_name: string,
  to_account_number: string,
  amount: number,
  description: string,
  timestamp: number
) {
  try {
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
  } catch (err) {
    handleError(err);
  }
}

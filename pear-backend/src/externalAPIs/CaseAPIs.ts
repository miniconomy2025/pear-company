import axios from "axios";
import type { CasesPriceResponse, CasesCreateOrderResponse, CasesGetOrderResponse } from "../types/extenalApis.js";

const CASE_BASE_URL = process.env.CASE_BASE_URL

const client = axios.create({
  baseURL: CASE_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
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

export async function getCases(): Promise<CasesPriceResponse | undefined> {
  try {
    const res = await client.get("/cases");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createCaseOrder(quantity: number): Promise<CasesCreateOrderResponse | undefined> {
  try {
    const res = await client.post("/orders", { quantity });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getOrder(id: number): Promise<CasesGetOrderResponse | undefined> {
  try {
    const res = await client.get(`/orders/${id}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

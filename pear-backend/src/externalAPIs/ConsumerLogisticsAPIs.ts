import axios from "axios";
import type { CustomersPickUpRequest, CustomersPickUpResponse, CustomersAllPickUpResponse, CustomersCompanyResponse } from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";

const CUSTOMER_LOGISTICS_BASE_URL = process.env.CUSTOMER_LOGISTICS_BASE_URL

const client = axios.create({
  baseURL: CUSTOMER_LOGISTICS_BASE_URL,
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

export async function createPickup(pickUp: CustomersPickUpRequest): Promise<CustomersPickUpResponse | undefined> {
  try {
    const res = await client.post("/api/pickup", pickUp);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function listPickups(status: string): Promise<Array<CustomersAllPickUpResponse> | undefined> {
  try {
    const res = await client.get("/api/pickup", {
      params: status ? { status } : undefined,
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createCompany(company_name: string): Promise<CustomersCompanyResponse | undefined> {
  try {
    const res = await client.post("/api/companies", { company_name });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function listCompanies(): Promise<Array<CustomersCompanyResponse> | undefined> {
  try {
    const res = await client.get("/api/companies");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

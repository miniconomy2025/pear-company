import axios from "axios";
import type {
  CustomersPickUpRequest,
  CustomersPickUpResponse,
  CustomersAllPickUpResponse,
  CustomersCompanyResponse,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const CUSTOMER_LOGISTICS_BASE_URL = process.env.CUSTOMER_LOGISTICS_BASE_URL;

const client = axios.create({
  baseURL: CUSTOMER_LOGISTICS_BASE_URL,
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

export const createPickup = resilient(
  async (
    pickUp: CustomersPickUpRequest
  ): Promise<CustomersPickUpResponse | undefined> => {
    const res = await client.post("/api/pickups", pickUp);
    return res.data;
  },
  { fallback: async (pickUp: CustomersPickUpRequest) => undefined }
);

export const listPickups = resilient(
  async (
    status: string
  ): Promise<Array<CustomersAllPickUpResponse> | undefined> => {
    const res = await client.get("/api/pickups", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  { fallback: async (status: string) => [] }
);

export const createCompany = resilient(
  async (
    company_name: string
  ): Promise<CustomersCompanyResponse | undefined> => {
    const res = await client.post("/api/companies", { company_name });
    return res.data;
  },
  { fallback: async (company_name: string) => undefined }
);

export const listCompanies = resilient(
  async (): Promise<Array<CustomersCompanyResponse> | undefined> => {
    const res = await client.get("/api/companies");
    return res.data;
  },
  { fallback: async () => [] }
);

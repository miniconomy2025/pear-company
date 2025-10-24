import axios from "axios";
import type {
  CustomersPickUpRequest,
  CustomersPickUpResponse,
  CustomersAllPickUpResponse,
  CustomersCompanyResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const CUSTOMER_LOGISTICS_BASE_URL = process.env.CUSTOMER_LOGISTICS_BASE_URL;

const client = createHttpClient(CUSTOMER_LOGISTICS_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

export const createPickup = resilient(
  async (
    pickUp: CustomersPickUpRequest
  ): Promise<CustomersPickUpResponse | undefined> => {
  console.log("/api/pickups");
  console.log(pickUp)
  try {
    const res = await client.post("/api/pickups", pickUp);
    console.log('Response:', res.data);
    return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
  },
  { fallback: async (pickUp: CustomersPickUpRequest) => undefined }
);

export const listPickups = resilient(
  async (
    status: string
  ): Promise<Array<CustomersAllPickUpResponse> | undefined> => {
    console.log(`/api/pickups`, status);
    try {
      const res = await client.get("/api/pickups", {
        params: status ? { status } : undefined,
      });
      console.log('Response:', res.data);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (status: string) => [] }
);

export const createCompany = resilient(
  async (
    company_name: string
  ): Promise<CustomersCompanyResponse | undefined> => {
    console.log("/api/companies", { company_name });
    try {
      const res = await client.post("/api/companies", { company_name });
      console.log('Response:', res.data);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async (company_name: string) => undefined }
);

export const listCompanies = resilient(
  async (): Promise<Array<CustomersCompanyResponse> | undefined> => {
    console.log(`/api/companies`);
    try {
      const res = await client.get("/api/companies");
      console.log('Response:', res.data);
      return res.data;
    } catch (err) {
      logError(err);
      return undefined;
    }
  },
  { fallback: async () => [] }
);

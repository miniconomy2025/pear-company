// src/externalAPIs/ConsumerLogisticsAPIs.ts
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

/**
 * WRITE: create a pickup request.
 * On failure, throw via fallback so callers can retry/compensate (don’t “pretend success”).
 * Success on any 2xx (Axios resolves only for 2xx by default).
 */
export const createPickup = resilient(
  async (pickUp: CustomersPickUpRequest): Promise<CustomersPickUpResponse | undefined> => {
    const res = await client.post("/api/pickups", pickUp);
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Customer logistics createPickup failed (fallback)");
    },
  }
);

/**
 * READ: list pickups. Safe to degrade to [] on failure.
 */
export const listPickups = resilient(
  async (status: string): Promise<Array<CustomersAllPickUpResponse> | undefined> => {
    const res = await client.get("/api/pickups", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  { fallback: async () => [] }
);

/**
 * WRITE: create a company. Fail loudly on error so upstream logic doesn’t continue incorrectly.
 */
export const createCompany = resilient(
  async (company_name: string): Promise<CustomersCompanyResponse | undefined> => {
    const res = await client.post("/api/companies", { company_name });
    return res.data;
  },
  {
    fallback: async () => {
      throw new Error("Customer logistics createCompany failed (fallback)");
    },
  }
);

/**
 * READ: list companies. Empty array on failure is acceptable.
 */
export const listCompanies = resilient(
  async (): Promise<Array<CustomersCompanyResponse> | undefined> => {
    const res = await client.get("/api/companies");
    return res.data;
  },
  { fallback: async () => [] }
);

import axios from "axios";
import type {
  BulkCreatePickUpRequest,
  BulkCreatePickUpResponse,
  BulkPickUpResponse,
} from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const BULK_LOGISTICS_BASE_URL = process.env.BULK_LOGISTICS_BASE_URL;

const client = axios.create({
  baseURL: BULK_LOGISTICS_BASE_URL,
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

const _createPickupRequest = async (
  request: BulkCreatePickUpRequest
): Promise<BulkCreatePickUpResponse | undefined> => {
  const res = await client.post("/api/pickup-request", request);
  if (res.status === 201) return res.data;
  throw new Error(`Unexpected response status: ${res.status}`);
};

export const createPickupRequest = resilient(_createPickupRequest, {
  fallback: async (_request: BulkCreatePickUpRequest) => undefined,
});

const _getPickupRequest = async (
  pickupRequestId: number
): Promise<BulkPickUpResponse | undefined> => {
  const res = await client.get(`/api/pickup-request/${pickupRequestId}`);
  if (res.status === 200) return res.data;
  throw new Error(`Unexpected response status: ${res.status}`);
};

export const getPickupRequest = resilient(_getPickupRequest, {
  fallback: async (_pickupRequestId: number) => undefined,
});

const _getPickupRequestsByCompany = async (
  companyId: string
): Promise<Array<BulkPickUpResponse> | undefined> => {
  const res = await client.get(`/api/pickup-request/company/${companyId}`);
  return res.data;
};

export const getPickupRequestsByCompany = resilient(
  _getPickupRequestsByCompany,
  {
    fallback: async (_companyId: string) => [],
  }
);

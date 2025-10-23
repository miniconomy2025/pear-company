import axios from "axios";
import type {
  BulkCreatePickUpRequest,
  BulkCreatePickUpResponse,
  BulkPickUpResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const BULK_LOGISTICS_BASE_URL = process.env.BULK_LOGISTICS_BASE_URL;

const client = createHttpClient(BULK_LOGISTICS_BASE_URL);

function logError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error("API error:", err.response?.data ?? err.message);
  } else if (err instanceof Error) {
    console.error("Error:", err.message);
  } else {
    console.error("Unknown error:", err);
  }
}

const _createPickupRequest = async (
  request: BulkCreatePickUpRequest
): Promise<BulkCreatePickUpResponse | undefined> => {
  console.log(`/api/pickup-request`, request);
  try {
    const res = await client.post("/api/pickup-request", request);
    return res.status === 201 ? res.data : undefined;
  } catch (err) {
    logError(err);
    return undefined;
  }
};

export const createPickupRequest = resilient(_createPickupRequest, {
  fallback: async (_request: BulkCreatePickUpRequest) => undefined,
});

const _getPickupRequest = async (
  pickupRequestId: number
): Promise<BulkPickUpResponse | undefined> => {
  console.log(`/api/pickup-request/${pickupRequestId}`);
  try {
    const res = await client.get(`/api/pickup-request/${pickupRequestId}`);
    if (res.status === 200) return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
};

export const getPickupRequest = resilient(_getPickupRequest, {
  fallback: async (_pickupRequestId: number) => undefined,
});

const _getPickupRequestsByCompany = async (
  companyId: string
): Promise<Array<BulkPickUpResponse> | undefined> => {
  console.log(`/api/pickup-request/company/${companyId}`);
  try {
    const res = await client.get(`/api/pickup-request/company/${companyId}`);
    return res.data;
  } catch (err) {
    logError(err);
    return undefined;
  }
};

export const getPickupRequestsByCompany = resilient(
  _getPickupRequestsByCompany,
  {
    fallback: async (_companyId: string) => [],
  }
);

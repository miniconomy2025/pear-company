// src/externalAPIs/BulkLogisticsAPIs.ts
import type {
  BulkCreatePickUpRequest,
  BulkCreatePickUpResponse,
  BulkPickUpResponse,
} from "../types/extenalApis.js";
import { createHttpClient } from "../config/httpClient.js";
import { resilient } from "../utils/resilience.js";

const BULK_LOGISTICS_BASE_URL = process.env.BULK_LOGISTICS_BASE_URL;
const client = createHttpClient(BULK_LOGISTICS_BASE_URL);

/**
 * Create a pickup request (WRITE). Must not "pretend success" if the call fails.
 * Return the provider response on any 2xx success; Axios throws otherwise.
 * Prefer 201 Created when the provider follows REST semantics. :contentReference[oaicite:1]{index=1}
 */
const _createPickupRequest = async (
  request: BulkCreatePickUpRequest
): Promise<BulkCreatePickUpResponse | undefined> => {
  const res = await client.post("/api/pickup-request", request);
  return res.data; // Axios only reaches here for 2xx by default
};

export const createPickupRequest = resilient(_createPickupRequest, {
  // For critical writes, fail loudly so callers can compensate (no silent undefined). 
  // (Idempotency keys + retries are a good complement at the caller or interceptor.) :contentReference[oaicite:2]{index=2}
  fallback: async () => {
    throw new Error("Bulk logistics createPickupRequest failed (fallback)");
  },
});

/**
 * Fetch a pickup request (READ). Safe to return undefined on failure.
 */
const _getPickupRequest = async (
  pickupRequestId: number
): Promise<BulkPickUpResponse | undefined> => {
  const res = await client.get(`/api/pickup-request/${pickupRequestId}`);
  return res.data;
};

export const getPickupRequest = resilient(_getPickupRequest, {
  fallback: async () => undefined,
});

/**
 * List pickup requests by company (READ). Empty array on failure is acceptable.
 */
const _getPickupRequestsByCompany = async (
  companyId: string
): Promise<Array<BulkPickUpResponse> | undefined> => {
  const res = await client.get(`/api/pickup-request/company/${companyId}`);
  return res.data;
};

export const getPickupRequestsByCompany = resilient(_getPickupRequestsByCompany, {
  fallback: async () => [],
});

import axios from "axios";
import type { BulkCreatePickUpRequest, BulkCreatePickUpResponse, BulkPickUpResponse } from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";

const BULK_LOGISTICS_BASE_URL = process.env.BULK_LOGISTICS_BASE_URL

const client = axios.create({
  baseURL: BULK_LOGISTICS_BASE_URL,
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

export async function createPickupRequest(request: BulkCreatePickUpRequest,): Promise<BulkCreatePickUpResponse | undefined> {
  try {
    const res = await client.post("/api/pickup-request", request);
    if (res.status === 201) {
      return res.data
    }
    else{
      throw new Error(`Unexpected response status: ${res.status}`)
    }
  } catch (err) {
    handleError(err);
  }
}

export async function getPickupRequest(pickupRequestId: number): Promise<BulkPickUpResponse | undefined> {
  try {
    const res = await client.get(`/api/pickup-request/${pickupRequestId}`);
    if (res.status === 200) {
      return res.data;
    }
    else {
      throw new Error(`Unexpected response status: ${res.status}`)
    }
  } catch (err) {
    handleError(err);
  }
}

export async function getPickupRequestsByCompany(companyId: string): Promise<Array<BulkPickUpResponse> | undefined> {
  try {
    const res = await client.get(`/pickup-request/company/${companyId}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

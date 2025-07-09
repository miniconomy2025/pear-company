import axios from "axios";
import type { BulkCreatePickUpRequest, BulkCreatePickUpResponse, BulkPickUpResponse } from "../types/extenalApis.js";

const client = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
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

export async function createPickupRequest(payload: BulkCreatePickUpRequest): Promise<BulkCreatePickUpResponse | undefined> {
  try {
    const res = await client.post("/pickup-request", payload);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getPickupRequest(id: number): Promise<BulkPickUpResponse | undefined> {
  try {
    const res = await client.get(`/pickup-request/${id}`);
    return res.data;
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

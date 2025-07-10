import axios from "axios";
import type { ScreensPriceResponse, ScreensCreateOrderResponse, ScreensGetOrderResponse } from "../types/extenalApis.js";

const client = axios.create({
  baseURL: "https://localhost:8080",
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

export async function getScreens(): Promise<ScreensPriceResponse | undefined> {
  try {
    const res = await client.get("/screens");
    return res.data; 
  } catch (err) {
    handleError(err);
  }
}

export async function createOrder(quantity: number): Promise<ScreensCreateOrderResponse | undefined> {
  try {
    const res = await client.post("/order", { quantity });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getOrder(orderId: number): Promise<ScreensGetOrderResponse | undefined> {
  try {
    const res = await client.get(`/order/${orderId}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

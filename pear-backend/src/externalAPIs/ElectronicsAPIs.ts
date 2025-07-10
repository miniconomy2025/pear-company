import axios from 'axios';
import type { ElectronicsPriceResponse, ElectronicsCreateOrderResponse, ElectronicsGetOrderResponse } from "../types/extenalApis.js";
import { httpsAgent } from '../config/httpClient.js';

const ELECTRONICS_BASE_URL = process.env.ELECTRONICS_BASE_URL

const client = axios.create({
  baseURL: ELECTRONICS_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
  httpsAgent : httpsAgent,
});

function handleError(err: unknown) {
  if (axios.isAxiosError(err)) {
    console.error('API error:', err.response?.data ?? err.message);
    throw err;
  } else if (err instanceof Error) {
    console.error('Error:', err.message);
    throw err;
  } else {
    console.error('Unknown error:', err);
    throw new Error(String(err));
  }
}

export async function getElectronics(): Promise<ElectronicsPriceResponse | undefined> {
  try {
    const res = await client.get('/electronics');
    return res?.data;
  } catch (err) {
    handleError(err);
  }
}

export async function createElectronicsOrder(quantity: number): Promise<ElectronicsCreateOrderResponse | undefined> {
  try {
    const res = await client.post('/orders', { quantity });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getOrder(orderId: number): Promise<ElectronicsGetOrderResponse | undefined> {
  try {
    const res = await client.get(`/orders/${orderId}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

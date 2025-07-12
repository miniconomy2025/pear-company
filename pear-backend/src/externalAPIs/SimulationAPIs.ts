import axios from "axios";
import type { 
  SimulationTimeResponse,
  SimulationBuyMachineResponse,
  SimulationMachineResponse,
  SimulationOrderPaymentResponse
 } from "../types/extenalApis.js";
import { httpsAgent } from "../config/httpClient.js";

const SIMULATION_API_BASE_URL = process.env.SIMULATION_API_BASE_URL

const client = axios.create({
  baseURL: SIMULATION_API_BASE_URL, 
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

// export async function getUnixEpochStartTime(): Promise<{ unixEpochStartTime: string} | undefined> {
//   try {
//     const res = await client.get("/unix-epoch-start-time");
//     return res.data;
//   } catch (err) {
//     handleError(err);
//   }
// }

export function getUnixEpochStartTime() {
  // Just return the expected mock format (sync or Promise as your code expects)
  return Promise.resolve({ unixEpochStartTime: "2024-07-12T00:00:00Z" });
}


export async function getCurrentSimulationTime(): Promise<SimulationTimeResponse | undefined> {
  try {
    const res = await client.get("/current-simulation-time");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function purchaseMachine(machineName: string, quantity: number): Promise<SimulationBuyMachineResponse | undefined> {
  try {
    const res = await client.post("/machines", {
      machineName,
      quantity,
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function confirmMachinePayment(orderId: number): Promise<SimulationOrderPaymentResponse | undefined> {
  try {
    const res = await client.post("/orders/payments", {
      orderId,
    })
    return res.data
  } catch (err) {
    handleError(err)
  }
}

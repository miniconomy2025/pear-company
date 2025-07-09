import axios from "axios";
import type { SimulationTimeResponse, SimulationBuyMachineResponse, SimulationMachineResponse } from "../types/extenalApis.js";

const SIMULATION_API_BASE_URL = process.env.SIMULATION_API_BASE_URL

const client = axios.create({
  baseURL: SIMULATION_API_BASE_URL, 
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

export async function getUnixEpochStartTime(): Promise<{ unixEpochStartTime: string} | undefined> {
  try {
    const res = await client.get("/simulation/unix-epoch-start-time");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getCurrentSimulationTime(): Promise<SimulationTimeResponse | undefined> {
  try {
    const res = await client.get("/simulation/current-simulation-time");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function purchaseMachine(machineName: string, quantity: number): Promise<SimulationBuyMachineResponse | undefined> {
  try {
    const res = await client.post("/simulation/purchase-machine", {
      machineName,
      quantity,
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

export async function getMachines(): Promise<SimulationMachineResponse | undefined> {
  try {
    const res = await client.get("/simulation/machines");
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

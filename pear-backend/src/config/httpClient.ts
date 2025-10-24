import https from "https"
import fs from "fs"
import path from "path"
import axios, { AxiosInstance } from "axios";

export const httpsAgent = new https.Agent({
  // cert: fs.readFileSync('/etc/nginx/client-certs/pear-company-client.crt'),
  // key: fs.readFileSync('/etc/nginx/client-certs/pear-company-client.key'),
  rejectUnauthorized: false,
})

const CLIENT_ID = process.env.CLIENT_ID ?? "pear-company";

export function createHttpClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 5000,
    headers: { "Content-Type": "application/json" },
    httpsAgent,
  });

  client.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    (config.headers as any)["Client-Id"] = CLIENT_ID;
    return config;
  });

  return client;
}

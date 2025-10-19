import https from "https"
import fs from "fs"
import path from "path"
import axios, { AxiosInstance } from "axios";

function readPemFromEnvOrFile(pemEnv?: string, pathEnv?: string): Buffer | undefined {
  const pem = pemEnv && pemEnv.trim() ? pemEnv : undefined;
  if (pem) return Buffer.from(pem);
  const p = pathEnv && pathEnv.trim() ? pathEnv : undefined;
  if (p && fs.existsSync(p)) return fs.readFileSync(p);
  return undefined;
}

export const httpsAgent = (() => {
  const cert = readPemFromEnvOrFile(process.env.MTLS_CLIENT_CERT_PEM, process.env.MTLS_CLIENT_CERT_PATH);
  const key  = readPemFromEnvOrFile(process.env.MTLS_CLIENT_KEY_PEM,  process.env.MTLS_CLIENT_KEY_PATH);
  const ca   = readPemFromEnvOrFile(process.env.MTLS_CA_PEM,          process.env.MTLS_CA_PATH);

  const hasMtls = !!(cert && key);

  const rejectUnauthorized =
    (process.env.HTTPS_REJECT_UNAUTHORIZED ?? "true").toLowerCase() === "true";

  const baseOptions: https.AgentOptions = {
    keepAlive: true, 
    rejectUnauthorized,
  };

  return new https.Agent({
    ...baseOptions,
    ...(hasMtls ? { cert, key } : {}),
    ...(ca ? { ca } : {}),
  });
})();

const CLIENT_ID = process.env.CLIENT_ID ?? "pear-company";
const HTTP_TIMEOUT_MS = Number.parseInt(process.env.HTTP_TIMEOUT_MS ?? "10000", 10);

export function createHttpClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: HTTP_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
    httpsAgent,
  });

  client.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    (config.headers as any)["Client-Id"] = CLIENT_ID;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err)
  );

  return client;
}

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const parseDbHost = (dbHost: string) => {
  if (dbHost.includes(":")) {
    const [host, port] = dbHost.split(":");
    return { host, port: Number.parseInt(port, 10) };
  }
  return { host: dbHost, port: 5432 };
};

const dbHostInfo = parseDbHost(process.env.DB_HOST || "localhost");

const buildSslConfig = (): false | { rejectUnauthorized: boolean; ca?: string } => {
  const url = process.env.DATABASE_URL || "";
  const sslEnv = (process.env.DB_SSL || "").toLowerCase();
  const sslMode = (process.env.PGSSLMODE || "").toLowerCase();

  const enableSsl =
    sslEnv === "true" ||
    sslMode === "require" ||
    /sslmode=require|ssl=true/i.test(url) ||
    process.env.NODE_ENV === "production";

  if (!enableSsl) return false;

  const rejectUnauthorized =
    (process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() === "true";

  const ca = process.env.DB_SSL_CA && process.env.DB_SSL_CA.trim().length > 0
    ? process.env.DB_SSL_CA
    : undefined;

  return ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
};

const dbConfig =
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: buildSslConfig() || undefined,
        max: Number.parseInt(process.env.DB_POOL_MAX || "20", 10),
        idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
        connectionTimeoutMillis: Number.parseInt(process.env.DB_CONN_TIMEOUT_MS || "10000", 10),
      }
    : {
        host: dbHostInfo.host,
        port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : dbHostInfo.port,
        database: process.env.DB_NAME || process.env.POSTGRES_DB || "peardb",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
        ssl: buildSslConfig(),
        max: Number.parseInt(process.env.DB_POOL_MAX || "20", 10),
        idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
        connectionTimeoutMillis: Number.parseInt(process.env.DB_CONN_TIMEOUT_MS || "10000", 10),
      } as const;

export const pool = new Pool(dbConfig as any);

pool.on("error", (err) => {
  console.error("Unexpected PG pool error (idle client):", err);
});

export const testConnection = async (): Promise<boolean> => {
  let client: pg.PoolClient | undefined;
  try {
    const where =
      "connectionString" in dbConfig
        ? (dbConfig as any).connectionString
        : `${(dbConfig as any).host}:${(dbConfig as any).port}/${(dbConfig as any).database}`;
    console.log(`Testing database connection to ${where} ...`);
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  } finally {
    client?.release();
  }
};

export const ensureDatabaseConnected = async (): Promise<void> => {
  const ok = await testConnection();
  if (!ok) {
    console.error("Exiting: database connection could not be established.");
    process.exit(1);
  }
};

let shuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}. Closing database pool...`);
  try {
    await pool.end();
    console.log("Database pool closed.");
  } catch (err) {
    console.error("Error closing database pool:", err);
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

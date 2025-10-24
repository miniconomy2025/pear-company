import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg

const parseDbHost = (dbHost: string) => {
  if (dbHost.includes(":")) {
    const [host, port] = dbHost.split(":")
    return { host, port: Number.parseInt(port, 10) }
  }
  return { host: dbHost, port: 5432 }
}

const dbHostInfo = parseDbHost(process.env.DB_HOST || "localhost")

// Database configuration
const dbConfig = {
  host: dbHostInfo.host,
  port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : dbHostInfo.port,
  database: "peardb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, 
  keepAlive: true,
}


export const pool = new Pool(dbConfig)

export const testConnection = async (): Promise<boolean> => {
  try {
    console.log(`Testing connection to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`)
    const client = await pool.connect()
    await client.query("SELECT NOW()")
    client.release()
    console.log("Database connection successful")
    console.log(`Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    console.error(`Attempted connection: ${dbConfig.host}:${dbConfig.port}`)
    console.error(`Database: ${dbConfig.database}`)
    console.error(`User: ${dbConfig.user}`)
    return false
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database pool...")
  await pool.end()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("Closing database pool...")
  await pool.end()
  process.exit(0)
})

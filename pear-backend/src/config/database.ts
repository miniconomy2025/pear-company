import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "peardb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create connection pool
export const pool = new Pool(dbConfig)

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect()
    await client.query("SELECT NOW()")
    client.release()
    console.log("✅ Database connection successful")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
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

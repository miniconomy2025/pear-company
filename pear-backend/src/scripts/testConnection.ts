import dotenv from "dotenv"
import pg from "pg"

// Load environment variables
dotenv.config()

const { Pool } = pg

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...")
  console.log("Configuration:")
  console.log(`  Host: ${process.env.DB_HOST}`)
  console.log(`  Port: ${process.env.DB_PORT}`)
  console.log(`  Database: ${process.env.DB_NAME}`)
  console.log(`  User: ${process.env.DB_USER}`)
  console.log(`  Password: ${process.env.DB_PASSWORD ? "***" : "NOT SET"}`)

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "peardb",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    ssl: false, // Disable SSL for local development
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 1000, // Increased timeout
  })

  const client = await pool.connect()
  try {
    console.log("\n🔄 Attempting to connect...")

    console.log("✅ Connection successful!")

    // Test a simple query
    const result = await client.query("SELECT NOW() as current_time, version() as pg_version")
    console.log("📊 Database info:")
    console.log(`  Current time: ${result.rows[0].current_time}`)
    console.log(`  PostgreSQL version: ${result.rows[0].pg_version}`)

    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log("\n📋 Available tables:")
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`)
    })

    // Test a query on one of our tables
    const phonesResult = await client.query("SELECT COUNT(*) as phone_count FROM phones")
    console.log(`\n📱 Phones in database: ${phonesResult.rows[0].phone_count}`)

    client.release()
  } catch (error) {
    console.error("❌ Connection failed!")
    console.error("Error details:", error)

    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error code:", (error as any).code)
    }
  } finally {
    client.release()
    process.exit(0)
  }
}

testDatabaseConnection()

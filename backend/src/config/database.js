
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool configuration
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
});

// New database connection
pool.on("connect", () => {
  console.log("PostgreSQL connection established.");
});

// Unexpected idle connection error
pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error
  );
});

// Test database connection
export async function testDatabaseConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    console.log(
      `Connected to database: ${result.rows[0].database}`
    );

    return result.rows[0];
  } catch (error) {
    console.error(
      "PostgreSQL connection test failed:",
      error
    );

    throw error;
  }
}

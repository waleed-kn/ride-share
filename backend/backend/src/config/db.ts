import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false }, // required for Neon
});

pool.on("error", (err) => {
  // A background/idle client failing shouldn't crash the whole server,
  // but we do want it visible in logs immediately.
  console.error("Unexpected Postgres pool error:", err);
});

export async function testDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ Postgres connected");
  } finally {
    client.release();
  }
}

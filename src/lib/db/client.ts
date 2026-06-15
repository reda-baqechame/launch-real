import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { isDatabaseEnabled } from "@/lib/cloud/config";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPool(): Pool | null {
  if (!isDatabaseEnabled()) return null;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") || url.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  const db = getPool();
  if (!db) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const schemaPath = join(process.cwd(), "db", "schema.sql");
      const sql = readFileSync(schemaPath, "utf8");
      await db.query(sql);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export async function withDb<T>(
  fn: (db: Pool) => Promise<T>,
): Promise<T | null> {
  const db = getPool();
  if (!db) return null;
  await ensureSchema();
  return fn(db);
}

import type { Pool } from "pg";

export interface AppUser {
  clerkId: string;
  email: string | null;
  credits: number;
  stripeCustomerId: string | null;
}

export async function ensureAppUser(
  db: Pool,
  clerkId: string,
  email?: string | null,
): Promise<AppUser> {
  const res = await db.query(
    `INSERT INTO app_users (clerk_id, email)
     VALUES ($1, $2)
     ON CONFLICT (clerk_id) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, app_users.email),
       updated_at = NOW()
     RETURNING clerk_id, email, credits, stripe_customer_id`,
    [clerkId, email ?? null],
  );
  const row = res.rows[0];
  return {
    clerkId: row.clerk_id,
    email: row.email,
    credits: row.credits,
    stripeCustomerId: row.stripe_customer_id,
  };
}

export async function getAppUser(db: Pool, clerkId: string): Promise<AppUser | null> {
  const res = await db.query(
    `SELECT clerk_id, email, credits, stripe_customer_id FROM app_users WHERE clerk_id = $1`,
    [clerkId],
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    clerkId: row.clerk_id,
    email: row.email,
    credits: row.credits,
    stripeCustomerId: row.stripe_customer_id,
  };
}

export async function addCredits(db: Pool, clerkId: string, delta: number): Promise<number> {
  const res = await db.query(
    `UPDATE app_users SET credits = credits + $2, updated_at = NOW()
     WHERE clerk_id = $1 RETURNING credits`,
    [clerkId, delta],
  );
  return res.rows[0]?.credits ?? 0;
}

export async function consumeCredit(db: Pool, clerkId: string): Promise<boolean> {
  const res = await db.query(
    `UPDATE app_users SET credits = credits - 1, updated_at = NOW()
     WHERE clerk_id = $1 AND credits > 0 RETURNING credits`,
    [clerkId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function setStripeCustomerId(
  db: Pool,
  clerkId: string,
  customerId: string,
): Promise<void> {
  await db.query(
    `UPDATE app_users SET stripe_customer_id = $2, updated_at = NOW() WHERE clerk_id = $1`,
    [clerkId, customerId],
  );
}

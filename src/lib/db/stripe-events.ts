import type { Pool } from "pg";

/** Returns true when this Stripe event has not been processed yet. */
export async function claimStripeEvent(db: Pool, eventId: string): Promise<boolean> {
  const res = await db.query(
    `INSERT INTO stripe_webhook_events (event_id) VALUES ($1)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId],
  );
  return (res.rowCount ?? 0) > 0;
}

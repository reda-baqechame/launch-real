import type { Pool } from "pg";

export type OAuthProvider = "youtube" | "producthunt";

export interface OAuthConnection {
  clerkId: string;
  provider: OAuthProvider;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
}

export async function upsertOAuthConnection(
  db: Pool,
  conn: Omit<OAuthConnection, "metadata"> & { metadata?: Record<string, unknown> },
): Promise<void> {
  await db.query(
    `INSERT INTO oauth_connections (clerk_id, provider, access_token, refresh_token, expires_at, metadata, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (clerk_id, provider) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_connections.refresh_token),
       expires_at = EXCLUDED.expires_at,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [
      conn.clerkId,
      conn.provider,
      conn.accessToken,
      conn.refreshToken,
      conn.expiresAt,
      conn.metadata ?? {},
    ],
  );
}

export async function getOAuthConnection(
  db: Pool,
  clerkId: string,
  provider: OAuthProvider,
): Promise<OAuthConnection | null> {
  const res = await db.query(
    `SELECT * FROM oauth_connections WHERE clerk_id = $1 AND provider = $2`,
    [clerkId, provider],
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    clerkId: row.clerk_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    metadata: row.metadata ?? {},
  };
}

export async function listOAuthConnections(
  db: Pool,
  clerkId: string,
): Promise<OAuthConnection[]> {
  const res = await db.query(
    `SELECT * FROM oauth_connections WHERE clerk_id = $1`,
    [clerkId],
  );
  return res.rows.map((row) => ({
    clerkId: row.clerk_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    metadata: row.metadata ?? {},
  }));
}

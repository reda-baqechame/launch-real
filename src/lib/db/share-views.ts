import type { Pool } from "pg";

export async function incrementShareView(db: Pool, projectId: string): Promise<number> {
  const res = await db.query(
    `INSERT INTO share_views (project_id, view_count, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (project_id) DO UPDATE SET
       view_count = share_views.view_count + 1,
       updated_at = NOW()
     RETURNING view_count`,
    [projectId],
  );
  return Number(res.rows[0]?.view_count ?? 1);
}

export async function getShareViewCount(db: Pool, projectId: string): Promise<number> {
  const res = await db.query(
    `SELECT view_count FROM share_views WHERE project_id = $1 LIMIT 1`,
    [projectId],
  );
  return Number(res.rows[0]?.view_count ?? 0);
}

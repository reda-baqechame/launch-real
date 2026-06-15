import type { Pool } from "pg";

export type ShareEventType = "view" | "play" | "cta";

export interface ShareEventCounts {
  views: number;
  plays: number;
  ctaClicks: number;
}

export async function incrementShareEvent(
  db: Pool,
  projectId: string,
  event: ShareEventType,
): Promise<ShareEventCounts> {
  await db.query(
    `INSERT INTO share_events (project_id, event_type) VALUES ($1, $2)`,
    [projectId, event],
  );
  return getShareEventCounts(db, projectId);
}

export async function getShareEventCounts(
  db: Pool,
  projectId: string,
): Promise<ShareEventCounts> {
  const res = await db.query(
    `SELECT event_type, COUNT(*)::int AS count
     FROM share_events WHERE project_id = $1 GROUP BY event_type`,
    [projectId],
  );
  const counts: ShareEventCounts = { views: 0, plays: 0, ctaClicks: 0 };
  for (const row of res.rows) {
    if (row.event_type === "view") counts.views = row.count;
    if (row.event_type === "play") counts.plays = row.count;
    if (row.event_type === "cta") counts.ctaClicks = row.count;
  }
  return counts;
}

/** @deprecated use incrementShareEvent */
export async function incrementShareView(db: Pool, projectId: string): Promise<number> {
  const c = await incrementShareEvent(db, projectId, "view");
  return c.views;
}

/** @deprecated use getShareEventCounts */
export async function getShareViewCount(db: Pool, projectId: string): Promise<number> {
  const c = await getShareEventCounts(db, projectId);
  return c.views;
}

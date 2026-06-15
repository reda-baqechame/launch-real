const EVENTS_KEY = "launchreel.share_events";

export type ShareEventType = "view" | "play" | "cta";

export interface ShareEventCounts {
  views: number;
  plays: number;
  ctaClicks: number;
}

function readAll(): Record<string, Partial<Record<ShareEventType, number>>> {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<Record<ShareEventType, number>>>) : {};
  } catch {
    return {};
  }
}

export function logShareEvent(projectId: string, type: ShareEventType): void {
  try {
    const all = readAll();
    const row = all[projectId] ?? {};
    row[type] = (row[type] ?? 0) + 1;
    all[projectId] = row;
    localStorage.setItem(EVENTS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function getShareEventCounts(projectId: string): ShareEventCounts {
  const row = readAll()[projectId] ?? {};
  return {
    views: row.view ?? 0,
    plays: row.play ?? 0,
    ctaClicks: row.cta ?? 0,
  };
}

export async function trackShareEventRemote(
  projectId: string,
  type: ShareEventType,
): Promise<void> {
  try {
    await fetch(`/api/share/${projectId}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: type }),
    });
  } catch {
    /* offline */
  }
}

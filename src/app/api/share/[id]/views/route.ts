import { NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import {
  getShareEventCounts,
  incrementShareEvent,
  type ShareEventType,
} from "@/lib/db/share-views";
import { isNextResponse, parseJsonBody } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

const VALID: ShareEventType[] = ["view", "play", "cta"];

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ projectId: id, enabled: false, counts: null });
  }

  const counts = await withDb(async (db) => getShareEventCounts(db, id));
  return NextResponse.json({
    projectId: id,
    enabled: true,
    counts: counts ?? { views: 0, plays: 0, ctaClicks: 0 },
    views: counts?.views ?? 0,
  });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const body = await parseJsonBody<{ event?: string }>(req);
  const event = (
    !isNextResponse(body) && VALID.includes(body.event as ShareEventType) ?
      (body.event as ShareEventType)
    : "view");

  if (!isDatabaseEnabled()) {
    return NextResponse.json({ projectId: id, enabled: false, counts: null });
  }

  const counts = await withDb(async (db) => incrementShareEvent(db, id, event));
  return NextResponse.json({
    projectId: id,
    enabled: true,
    counts: counts ?? { views: 0, plays: 0, ctaClicks: 0 },
    views: counts?.views ?? 0,
  });
}

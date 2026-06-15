import { NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { getShareViewCount, incrementShareView } from "@/lib/db/share-views";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ projectId: id, views: null, enabled: false });
  }

  const views = await withDb(async (db) => getShareViewCount(db, id));
  return NextResponse.json({ projectId: id, views: views ?? 0, enabled: true });
}

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ projectId: id, views: null, enabled: false });
  }

  const views = await withDb(async (db) => incrementShareView(db, id));
  return NextResponse.json({ projectId: id, views: views ?? 1, enabled: true });
}

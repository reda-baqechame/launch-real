import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isHostedSaas } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { consumeCredit, ensureAppUser, getAppUser } from "@/lib/db/users";
import { isNextResponse, jsonError } from "@/lib/api-helpers";
import { isLocalFreeRequest, LOCAL_FREE_CREDITS } from "@/lib/local-free";

export const runtime = "nodejs";

/** Deduct one kit credit when starting full launch kit generation (hosted SaaS). */
export async function POST(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({ ok: true, localFree: true, creditsRemaining: LOCAL_FREE_CREDITS });
  }

  if (!isHostedSaas()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const consumed = await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    return consumeCredit(db, userId);
  });

  if (!consumed) {
    return jsonError("No kit credits remaining. Upgrade on /pricing.", 402);
  }

  const user = await withDb(async (db) => getAppUser(db, userId));
  return NextResponse.json({ ok: true, creditsRemaining: user?.credits ?? 0 });
}

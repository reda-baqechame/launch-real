import { NextResponse } from "next/server";
import { getAuthEmail, requireAuthUserId } from "@/lib/auth";
import { isCloudSyncEnabled, isStripeEnabled } from "@/lib/cloud/config";
import { withDb } from "@/lib/db/client";
import { ensureAppUser, getAppUser } from "@/lib/db/users";
import { isNextResponse } from "@/lib/api-helpers";
import { isLocalFreeRequest, LOCAL_FREE_CREDITS } from "@/lib/local-free";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (isLocalFreeRequest(req)) {
    return NextResponse.json({
      enabled: true,
      stripe: true,
      localFree: true,
      credits: LOCAL_FREE_CREDITS,
      label: "Unlimited local test credits",
    });
  }

  if (!isCloudSyncEnabled()) {
    return NextResponse.json({
      enabled: false,
      credits: null,
      label: "Local mode — 3 free kits",
    });
  }

  const userId = await requireAuthUserId();
  if (isNextResponse(userId)) return userId;

  const user = await withDb(async (db) => {
    await ensureAppUser(db, userId, await getAuthEmail());
    return getAppUser(db, userId);
  });

  return NextResponse.json({
    enabled: true,
    stripe: isStripeEnabled(),
    credits: user?.credits ?? 0,
    label: `${user?.credits ?? 0} kit credit${user?.credits === 1 ? "" : "s"}`,
  });
}

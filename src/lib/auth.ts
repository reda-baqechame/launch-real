import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isClerkEnabled } from "@/lib/cloud/config";
import { isLocalFreeAllowedForHost, LOCAL_FREE_USER_ID } from "@/lib/local-free";

export async function getAuthUserId(): Promise<string | null> {
  try {
    const h = await headers();
    if (isLocalFreeAllowedForHost(h.get("host"))) return LOCAL_FREE_USER_ID;
  } catch {
    /* headers() is only available during a request. */
  }
  if (!isClerkEnabled()) return null;
  const { userId } = await auth();
  return userId;
}

export async function requireAuthUserId(): Promise<string | NextResponse> {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required. Configure Clerk keys to enable cloud sync." },
      { status: 401 },
    );
  }
  return userId;
}

export async function getAuthEmail(): Promise<string | null> {
  try {
    const h = await headers();
    if (isLocalFreeAllowedForHost(h.get("host"))) return "local-free@launchreel.test";
  } catch {
    /* headers() is only available during a request. */
  }
  if (!isClerkEnabled()) return null;
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

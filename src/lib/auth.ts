import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkEnabled } from "@/lib/cloud/config";

export async function getAuthUserId(): Promise<string | null> {
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
  if (!isClerkEnabled()) return null;
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

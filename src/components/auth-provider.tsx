"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { CloudSyncProvider } from "@/components/cloud-sync-provider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return children;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <CloudSyncProvider>{children}</CloudSyncProvider>
    </ClerkProvider>
  );
}

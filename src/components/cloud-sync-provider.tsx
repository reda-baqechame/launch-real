"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { syncCloudProjects } from "@/lib/cloud-sync";
import { uploadProjectsBlobs } from "@/lib/blob-cloud-sync";
import { getSyncableProjects, mergeCloudProjects } from "@/lib/store";

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const synced = useRef(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synced.current) return;
    synced.current = true;

    void (async () => {
      setSyncing(true);
      try {
        const local = getSyncableProjects();
        const merged = await syncCloudProjects(local);
        if (merged.length) mergeCloudProjects(merged);
        await uploadProjectsBlobs(getSyncableProjects());
      } finally {
        setSyncing(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) synced.current = false;
  }, [isLoaded, isSignedIn]);

  return (
    <>
      {isSignedIn && syncing && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-mute shadow-lg">
          Syncing projects and media to cloud…
        </div>
      )}
      {children}
    </>
  );
}

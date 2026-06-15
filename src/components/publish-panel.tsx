"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";

interface PublishPanelProps {
  projectId: string;
  productName: string;
  tagline?: string;
}

export function PublishPanel({ projectId, productName, tagline }: PublishPanelProps) {
  const [youtubeBusy, setYoutubeBusy] = useState(false);
  const [phBusy, setPhBusy] = useState(false);
  const [youtubeMsg, setYoutubeMsg] = useState<string | null>(null);
  const [phMsg, setPhMsg] = useState<string | null>(null);

  const publishYouTube = useCallback(async () => {
    setYoutubeBusy(true);
    setYoutubeMsg(null);
    try {
      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `${productName} — launch video`,
          description: tagline ?? `Created with LaunchReel — ${productName}`,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        needsCloudBackup?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "YouTube publish failed.");
      }
      setYoutubeMsg(data.message ?? "YouTube upload queued.");
    } catch (e) {
      setYoutubeMsg(e instanceof Error ? e.message : "YouTube publish failed.");
    } finally {
      setYoutubeBusy(false);
    }
  }, [projectId, productName, tagline]);

  const publishProductHunt = useCallback(async () => {
    setPhBusy(true);
    setPhMsg(null);
    try {
      const res = await fetch("/api/producthunt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          tagline: tagline ?? productName,
          description: projectId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        needsCloudBackup?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Product Hunt publish failed.");
      }
      setPhMsg(data.message ?? "Product Hunt publish queued.");
    } catch (e) {
      setPhMsg(e instanceof Error ? e.message : "Product Hunt publish failed.");
    } finally {
      setPhBusy(false);
    }
  }, [projectId, productName, tagline]);

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-4">
      <p className="text-sm font-medium text-ink">Publish to platforms</p>
      <p className="mt-1 text-xs text-ink-mute">
        Requires sign-in, OAuth on{" "}
        <Link href="/settings" className="text-accent-ink hover:text-accent-soft">
          /settings
        </Link>
        , and cloud media backup for video upload.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={youtubeBusy}
          onClick={() => void publishYouTube()}
        >
          {youtubeBusy ? "Publishing…" : "Publish to YouTube"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={phBusy}
          onClick={() => void publishProductHunt()}
        >
          {phBusy ? "Publishing…" : "Publish to Product Hunt"}
        </Button>
      </div>
      {youtubeMsg && <p className="mt-2 text-xs text-ink-soft">{youtubeMsg}</p>}
      {phMsg && <p className="mt-2 text-xs text-ink-soft">{phMsg}</p>}
    </div>
  );
}

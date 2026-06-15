"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import type { PhLaunchPackage } from "@/lib/ph-launch-prep";

interface PublishPanelProps {
  projectId: string;
  productName: string;
  tagline?: string;
}

export function PublishPanel({ projectId, productName, tagline }: PublishPanelProps) {
  const [youtubeBusy, setYoutubeBusy] = useState(false);
  const [phBusy, setPhBusy] = useState(false);
  const [youtubeMsg, setYoutubeMsg] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [phMsg, setPhMsg] = useState<string | null>(null);
  const [phPackage, setPhPackage] = useState<PhLaunchPackage | null>(null);

  const publishYouTube = useCallback(async () => {
    setYoutubeBusy(true);
    setYoutubeMsg(null);
    setYoutubeUrl(null);
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
        url?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "YouTube publish failed.");
      }
      setYoutubeMsg(data.message ?? "Uploaded to YouTube.");
      if (data.url) setYoutubeUrl(data.url);
    } catch (e) {
      setYoutubeMsg(e instanceof Error ? e.message : "YouTube publish failed.");
    } finally {
      setYoutubeBusy(false);
    }
  }, [projectId, productName, tagline]);

  const publishProductHunt = useCallback(async () => {
    setPhBusy(true);
    setPhMsg(null);
    setPhPackage(null);
    try {
      const res = await fetch("/api/producthunt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          tagline: tagline ?? productName,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        launchPackage?: PhLaunchPackage;
      };
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Product Hunt prep failed.");
      }
      setPhMsg(data.message ?? "Launch package ready.");
      if (data.launchPackage) {
        setPhPackage(data.launchPackage);
        window.open(data.launchPackage.submitUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setPhMsg(e instanceof Error ? e.message : "Product Hunt prep failed.");
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
          {youtubeBusy ? "Uploading…" : "Upload to YouTube"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={phBusy}
          onClick={() => void publishProductHunt()}
        >
          {phBusy ? "Preparing…" : "Prepare Product Hunt launch"}
        </Button>
      </div>
      {youtubeMsg && (
        <p className="mt-2 text-xs text-ink-soft">
          {youtubeMsg}
          {youtubeUrl && (
            <>
              {" "}
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="text-accent-ink hover:text-accent-soft">
                Open video ↗
              </a>
            </>
          )}
        </p>
      )}
      {phMsg && <p className="mt-2 text-xs text-ink-soft">{phMsg}</p>}
      {phPackage && (
        <div className="mt-3 rounded-lg border border-line bg-base p-3 text-xs text-ink-soft">
          <p className="font-medium text-ink">PH launch checklist</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            {phPackage.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2">
            <span className="text-ink-mute">Tagline:</span> {phPackage.tagline}
          </p>
          {phPackage.galleryVideoUrl && (
            <p className="mt-1 break-all">
              <span className="text-ink-mute">Gallery video:</span> {phPackage.galleryVideoUrl}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

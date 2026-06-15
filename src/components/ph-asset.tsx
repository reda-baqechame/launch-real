"use client";

import { useEffect, useState } from "react";
import { getBlobUrl } from "@/lib/footage-store";
import { downloadBlob } from "@/lib/download-utils";
import { MediaAsset, CopyAsset } from "@/components/asset-bits";
import { isImageDataUrl } from "@/lib/download-utils";
import type { LaunchAsset } from "@/lib/types";

export function ProductHuntAsset({ asset }: { asset: LaunchAsset }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!asset.blobKey || asset.id !== "ph-video") return;
    let revoked: string | null = null;
    void getBlobUrl(asset.blobKey, "render").then((url) => {
      if (url) {
        revoked = url;
        setVideoUrl(url);
      }
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [asset.blobKey, asset.id]);

  if (asset.body && !isImageDataUrl(asset.body)) {
    return <CopyAsset asset={asset} />;
  }

  if (asset.id === "ph-video" && videoUrl) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 sm:col-span-2">
        <p className="font-medium text-ink">{asset.title}</p>
        {asset.meta && <p className="text-xs text-ink-mute">{asset.meta}</p>}
        <video
          src={videoUrl}
          controls
          className="mt-3 aspect-video w-full rounded-lg border border-line bg-black"
        />
        <button
          onClick={() => {
            void fetch(videoUrl)
              .then((r) => r.blob())
              .then((blob) => downloadBlob(blob, "launchreel-ph-gallery-video.webm"));
          }}
          className="mt-3 rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-line-strong hover:text-ink"
        >
          Download gallery video
        </button>
      </div>
    );
  }

  return <MediaAsset asset={asset} />;
}

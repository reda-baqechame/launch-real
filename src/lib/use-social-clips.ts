"use client";

import { useEffect, useState } from "react";
import { getBlobUrl } from "@/lib/footage-store";
import type { LaunchAsset } from "@/lib/types";

export interface SocialClipPreview {
  asset: LaunchAsset;
  url: string;
}

export function useSocialClips(assets: LaunchAsset[]): {
  clips: SocialClipPreview[];
  loading: boolean;
} {
  const [clips, setClips] = useState<SocialClipPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const keySig = assets.filter((a) => a.blobKey).map((a) => a.blobKey).join(",");

  useEffect(() => {
    if (!keySig) {
      const t = setTimeout(() => {
        setClips([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const urls: string[] = [];
    const withKeys = assets.filter((a) => a.blobKey);
    const t = setTimeout(() => setLoading(true), 0);

    void Promise.all(
      withKeys.map(async (asset) => {
        const url = await getBlobUrl(asset.blobKey!, "render");
        return url ? { asset, url } : null;
      }),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((item) => item && URL.revokeObjectURL(item.url));
        return;
      }
      const valid = loaded.filter(Boolean) as SocialClipPreview[];
      urls.push(...valid.map((v) => v.url));
      setClips(valid);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(t);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [assets, keySig]);

  return { clips, loading };
}

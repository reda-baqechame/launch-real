"use client";

import { useEffect, useState } from "react";
import { getBlobUrl } from "@/lib/footage-store";
import type { RenderOutput } from "@/lib/types";

export interface RenderPreview {
  aspect: RenderOutput["aspect"];
  url: string;
  blobKey: string;
}

export function useProjectRenders(renders?: RenderOutput[]): {
  items: RenderPreview[];
  loading: boolean;
} {
  const [items, setItems] = useState<RenderPreview[]>([]);
  const [loading, setLoading] = useState(Boolean(renders?.length));

  useEffect(() => {
    if (!renders?.length) {
      const t = setTimeout(() => {
        setItems([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const urls: string[] = [];

    const t = setTimeout(() => setLoading(true), 0);
    void Promise.all(
      renders.map(async (r) => {
        const url = await getBlobUrl(r.blobKey, "render");
        return url ? { aspect: r.aspect, url, blobKey: r.blobKey } : null;
      }),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((item) => item && URL.revokeObjectURL(item.url));
        return;
      }
      const valid = loaded.filter(Boolean) as RenderPreview[];
      urls.push(...valid.map((v) => v.url));
      setItems(valid);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(t);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [renders]);

  return { items, loading };
}

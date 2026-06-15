"use client";

import { useEffect, useState } from "react";
import { getBlobUrl } from "@/lib/footage-store";
import type { FootageMeta } from "@/lib/types";

export function useFootageUrl(footage?: FootageMeta): {
  url: string | null;
  loading: boolean;
} {
  const blobKey = footage?.blobKey;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(blobKey));

  useEffect(() => {
    if (!blobKey) return;

    let revoked: string | null = null;
    let cancelled = false;

    void getBlobUrl(blobKey, "footage").then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      revoked = u;
      setUrl(u);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [blobKey]);

  if (!blobKey) {
    return { url: null, loading: false };
  }

  return { url, loading };
}

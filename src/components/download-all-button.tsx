"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { downloadBlob } from "@/lib/download-utils";
import { buildProjectZip } from "@/lib/zip-export";
import type { Project } from "@/lib/types";

export function DownloadAllButton({ project }: { project: Project }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadAll = useCallback(async () => {
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      const slug = project.name.replace(/[^\w.-]+/g, "-").toLowerCase() || "launchreel";
      const zip = await buildProjectZip(project);
      downloadBlob(zip, `${ slug}-launch-kit.zip`);
      setDone(true);
    } catch (e) {
      setDone(false);
      setError(e instanceof Error ? e.message : "Could not build ZIP.");
    } finally {
      setBusy(false);
    }
  }, [project]);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="lg" disabled={busy} onClick={() => void downloadAll()}>
        {busy ? "Building ZIP…" : done ? "Downloaded ✓" : "Download all assets (ZIP)"}
      </Button>
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}

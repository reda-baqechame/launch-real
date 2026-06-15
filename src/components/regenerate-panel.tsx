"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  regenerateLaunchCopy,
  regenerateSocialClips,
} from "@/lib/regenerate-assets";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

type RegenerateKind = "social" | "copy";

export function RegeneratePanel({ project }: { project: Project }) {
  const { attachAssets, attachCaptions } = useStore();
  const [busy, setBusy] = useState<RegenerateKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(kind: RegenerateKind) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      if (kind === "social") {
        const social = await regenerateSocialClips(project);
        attachAssets(project.id, { social });
        setNotice(`Regenerated ${social.length} social clip${social.length === 1 ? "" : "s"}.`);
      } else {
        const { captions, social, copy } = await regenerateLaunchCopy(project);
        attachCaptions(project.id, captions);
        attachAssets(project.id, { social, copy });
        setNotice("Launch copy and clip captions updated.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed.");
    } finally {
      setBusy(null);
    }
  }

  const canRegenerate = project.moments.length > 0;

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-sm font-medium text-ink">Regenerate assets</p>
      <p className="mt-1 text-xs text-ink-mute">
        Re-run one slice of your kit without a full render from Moments.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canRegenerate || busy !== null}
          onClick={() => void run("social")}
        >
          {busy === "social" ? "Rendering clips…" : "Social clips only"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canRegenerate || busy !== null}
          onClick={() => void run("copy")}
        >
          {busy === "copy" ? "Writing copy…" : "Copy only"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      {notice && (
        <p className="mt-2 text-xs text-good">{notice}</p>
      )}
    </div>
  );
}

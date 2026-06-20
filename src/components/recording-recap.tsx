"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { CopyButton } from "@/components/asset-bits";
import { fetchRecap, type RecapResult } from "@/lib/ai";

/**
 * Recording → title, summary & chapters. Uses the teleprompter narration (the
 * user can edit it here) plus the recording length, generated with Claude.
 * The Loom/Guidde-style "recording becomes metadata" step. AI readiness
 * (hosted, local-free, or a connected key) is enforced by fetchRecap.
 */
export function RecordingRecap({
  notes,
  durationSec,
}: {
  notes: string;
  durationSec: number;
}) {
  const [text, setText] = useState(notes);
  const [recap, setRecap] = useState<RecapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      setRecap(await fetchRecap({ notes: text, durationSec }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recap failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-ink">Title, summary &amp; chapters</p>
      <p className="mt-1 text-xs text-ink-mute">
        Loom stops at a link. Turn this recording into clean video metadata.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or edit your narration so the chapters match what you showed…"
        className="mt-3 h-24 w-full resize-none rounded-lg border border-line bg-base p-3 text-sm leading-relaxed text-ink-soft outline-none focus:border-accent/60"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => void generate()} disabled={busy}>
          {busy ? "Generating…" : "Generate with Claude"}
        </Button>
        {error && <span className="text-xs text-warn">{error}</span>}
      </div>

      {recap && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wider text-ink-mute">Title</p>
              <CopyButton text={recap.title} />
            </div>
            <p className="mt-1 font-medium text-ink">{recap.title}</p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wider text-ink-mute">Summary</p>
              <CopyButton text={recap.summary} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">{recap.summary}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-mute">Chapters</p>
            <ul className="mt-2 space-y-1.5">
              {recap.chapters.map((c, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-accent-ink">{c.time}</span>
                  <span className="text-ink-soft">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

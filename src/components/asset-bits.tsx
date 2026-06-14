"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { LaunchAsset } from "@/lib/types";
import { rewriteCopy, useAnthropicKey, type CopyContext } from "@/lib/ai";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — no-op for this mock milestone */
    }
  }
  return (
    <button
      onClick={copy}
      className={cn(
        "rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

/** A small action button used across asset rows (Download / Preview / Regenerate). */
export function AssetAction({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
      {children}
    </button>
  );
}

/** Media-style asset (videos, PH images) — title + meta + actions. */
export function MediaAsset({ asset }: { asset: LaunchAsset }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-mute">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{asset.title}</p>
          {asset.meta && <p className="truncate text-xs text-ink-mute">{asset.meta}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <AssetAction>Preview</AssetAction>
        <AssetAction>Download</AssetAction>
        <AssetAction>Regenerate</AssetAction>
      </div>
    </div>
  );
}

const REWRITES: { label: string; instruction: string }[] = [
  { label: "Rewrite", instruction: "Rewrite this with the same intent but fresh, sharper wording." },
  { label: "More founder-like", instruction: "Rewrite in a personal, honest, first-person founder voice." },
  { label: "Less hype", instruction: "Rewrite with less hype — plain, direct, and concrete." },
];

/**
 * Text/copy asset. With an Anthropic key connected (and product context), the
 * Rewrite / voice buttons call Claude and replace the body live. Otherwise they
 * fall back to inert labels.
 */
export function CopyAsset({
  asset,
  context,
}: {
  asset: LaunchAsset;
  context?: CopyContext;
}) {
  const aiKey = useAnthropicKey();
  const [body, setBody] = useState(asset.body);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const aiOn = !!aiKey && !!context;

  async function rewrite(label: string, instruction: string) {
    if (!context) return;
    setBusy(label);
    setError(false);
    try {
      const next = await rewriteCopy({ title: asset.title, body, instruction, context });
      setBody(next);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-ink">{asset.title}</p>
        {asset.meta && <span className="text-xs text-ink-mute">{asset.meta}</span>}
      </div>
      {body && (
        <pre
          className={cn(
            "mt-3 whitespace-pre-wrap rounded-lg border border-line bg-base p-3 font-sans text-sm leading-relaxed text-ink-soft transition-opacity",
            busy && "opacity-50",
          )}
        >
          {body}
        </pre>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {body && <CopyButton text={body} />}
        {REWRITES.map((r) =>
          aiOn ? (
            <button
              key={r.label}
              disabled={!!busy}
              onClick={() => rewrite(r.label, r.instruction)}
              className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
            >
              {busy === r.label ? "Rewriting…" : r.label}
            </button>
          ) : (
            <AssetAction key={r.label}>{r.label}</AssetAction>
          ),
        )}
        {error && <span className="text-xs text-warn">Rewrite failed</span>}
      </div>
    </div>
  );
}

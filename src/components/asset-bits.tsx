"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { LaunchAsset } from "@/lib/types";

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

/** Text/copy asset — shows body with a working Copy button. */
export function CopyAsset({ asset }: { asset: LaunchAsset }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-ink">{asset.title}</p>
        {asset.meta && <span className="text-xs text-ink-mute">{asset.meta}</span>}
      </div>
      {asset.body && (
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-base p-3 font-sans text-sm leading-relaxed text-ink-soft">
          {asset.body}
        </pre>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {asset.body && <CopyButton text={asset.body} />}
        <AssetAction>Rewrite</AssetAction>
        <AssetAction>More founder-like</AssetAction>
        <AssetAction>Less hype</AssetAction>
      </div>
    </div>
  );
}

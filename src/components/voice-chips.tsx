"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Inert voice/tone toggles. They reflect the vision's "anti-slop" controls
 * ("More founder-like", "Less hype"…). Selection is visual-only for this
 * milestone — later they re-run the copy/voice engine.
 */
export function VoiceChips({ options }: { options: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setActive((a) => (a === opt ? null : opt))}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            active === opt
              ? "border-accent/50 bg-accent/15 text-accent-ink"
              : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

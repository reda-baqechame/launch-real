"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function VoiceChips({
  options,
  active: controlledActive,
  onSelect,
  disabled,
  busy,
}: {
  options: string[];
  active?: string | null;
  onSelect?: (label: string) => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = controlledActive !== undefined ? controlledActive : internalActive;

  function handleClick(opt: string) {
    if (disabled || busy) return;
    if (onSelect) {
      onSelect(opt);
      return;
    }
    setInternalActive((a) => (a === opt ? null : opt));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled || busy}
          onClick={() => handleClick(opt)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50",
            active === opt
              ? "border-accent/50 bg-accent/15 text-accent-ink"
              : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
          )}
        >
          {busy && active === opt ? "Rewriting…" : opt}
        </button>
      ))}
    </div>
  );
}

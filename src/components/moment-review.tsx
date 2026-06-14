"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { DemoMoment, StoryRole } from "@/lib/types";

const ROLE_STYLES: Partial<Record<StoryRole, string>> = {
  Before: "text-ink-soft border-line-strong bg-surface-2",
  "Problem setup": "text-ink-soft border-line-strong bg-surface-2",
  "Magic moment": "text-accent-ink border-accent/40 bg-accent/10",
  "Feature reveal": "text-accent-ink border-accent/30 bg-accent/[0.07]",
  Proof: "text-good border-good/30 bg-good/10",
  Payoff: "text-good border-good/30 bg-good/10",
  CTA: "text-good border-good/30 bg-good/10",
  Remove: "text-ink-mute border-line bg-surface",
  Risky: "text-warn border-warn/30 bg-warn/10",
};

const GEN_STEPS = [
  "Writing the script…",
  "Building the storyboard…",
  "Rendering preview…",
  "Running the quality judge…",
  "Packaging the launch kit…",
];

export function MomentReview({
  projectId,
  moments,
}: {
  projectId: string;
  moments: DemoMoment[];
}) {
  const router = useRouter();
  const [kept, setKept] = useState<Record<string, boolean>>(
    Object.fromEntries(moments.map((m) => [m.id, m.keepByDefault])),
  );
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  const keptCount = Object.values(kept).filter(Boolean).length;

  function generate() {
    setGenerating(true);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= GEN_STEPS.length) {
        clearInterval(t);
        router.push(`/projects/${projectId}/result`);
        return;
      }
      setStep(i);
    }, 600);
  }

  if (generating) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-surface">
          <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-ink">Making your launch kit</h2>
        <ul className="mt-8 w-full space-y-2 text-left">
          {GEN_STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                i < step
                  ? "border-line bg-surface text-ink-soft"
                  : i === step
                    ? "border-accent/40 bg-accent/10 text-ink"
                    : "border-line bg-surface/50 text-ink-faint",
              )}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px]", i < step ? "bg-good/20 text-good" : i === step ? "bg-accent/20 text-accent-ink animate-pulse-soft" : "bg-surface-2 text-ink-faint")}>
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 space-y-2">
        {moments.map((m) => {
          const on = kept[m.id];
          return (
            <li
              key={m.id}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition-colors",
                on ? "border-line bg-surface" : "border-line bg-surface/40 opacity-60",
              )}
            >
              <button
                onClick={() => setKept((k) => ({ ...k, [m.id]: !k[m.id] }))}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] transition-colors",
                  on ? "border-accent bg-accent text-white" : "border-line-strong text-transparent hover:border-ink-mute",
                )}
                aria-label={on ? "Remove moment" : "Keep moment"}
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-mute">{m.timecode}</span>
                  <span className="font-medium text-ink">{m.title}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px]",
                      ROLE_STYLES[m.role] ?? "text-ink-soft border-line bg-surface-2",
                    )}
                  >
                    {m.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-mute">{m.why}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-mute">
          Keeping <span className="text-ink">{keptCount}</span> of {moments.length} moments.
        </p>
        <Button onClick={generate} size="lg">
          Make the launch kit →
        </Button>
      </div>
    </>
  );
}

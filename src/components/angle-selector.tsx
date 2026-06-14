"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { StoryAngle } from "@/lib/types";

export function AngleSelector({
  projectId,
  angles,
  defaultSelected,
}: {
  projectId: string;
  angles: StoryAngle[];
  defaultSelected: string;
}) {
  const [selected, setSelected] = useState(defaultSelected);
  const chosen = angles.find((a) => a.id === selected) ?? angles[0];

  return (
    <>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {angles.map((a) => {
          const on = a.id === selected;
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-colors",
                on
                  ? "border-accent/60 bg-accent/[0.07]"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-mute">
                  {a.kind}
                </span>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-[11px]",
                    on ? "border-accent bg-accent text-white" : "border-line-strong text-transparent",
                  )}
                >
                  ✓
                </span>
              </div>
              <p className="mt-3 text-lg font-medium leading-snug text-ink">
                “{a.hook}”
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Meta label="Best for" value={a.audience} />
                <Meta label="Platform" value={a.platformFit} />
                <Meta label="Emotion" value={a.emotion} />
                <Meta label="Risk" value={a.risk} />
              </dl>
            </button>
          );
        })}
      </div>

      {/* Detail for selected angle */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
        <p className="text-xs uppercase tracking-wider text-ink-mute">
          Why “{chosen.kind}” could work — and could fail
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-good/20 bg-good/[0.06] p-4">
            <p className="text-xs font-medium text-good">Why it works</p>
            <p className="mt-1 text-sm text-ink-soft">{chosen.whyItWorks}</p>
          </div>
          <div className="rounded-lg border border-bad/20 bg-bad/[0.06] p-4">
            <p className="text-xs font-medium text-bad">Why it could fail</p>
            <p className="mt-1 text-sm text-ink-soft">{chosen.whyItFails}</p>
          </div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider text-ink-mute">
          Example first line
        </p>
        <p className="mt-1 text-ink">“{chosen.firstLine}”</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-mute">
          This angle is clearer, but you can always regenerate later.
        </p>
        <ButtonLink href={`/projects/${projectId}/moments`} size="lg">
          Use this angle →
        </ButtonLink>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-mute">{label}</dt>
      <dd className="text-ink-soft">{value}</dd>
    </div>
  );
}

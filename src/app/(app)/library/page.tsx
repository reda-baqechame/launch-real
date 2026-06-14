"use client";

import Link from "next/link";
import { Card, Eyebrow, StatusBadge } from "@/components/ui";
import { useStore } from "@/lib/store";

const COLLECTIONS = [
  "Product videos",
  "Team videos",
  "Tutorials",
  "Launch kits",
  "Interactive demos",
  "Docs",
];

export default function LibraryPage() {
  const { projects } = useStore();
  return (
    <div className="mx-auto max-w-5xl">
      <Eyebrow>Library</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">Where your product videos live.</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {COLLECTIONS.map((c, i) => (
          <span
            key={c}
            className={
              i === 3
                ? "rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent-ink"
                : "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft"
            }
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}/result`}
            className="group"
          >
            <Card className="overflow-hidden p-0 transition-colors group-hover:border-line-strong">
              <div className="relative flex aspect-video items-center justify-center bg-surface-2">
                <div className="absolute inset-0 glow-accent opacity-50" />
                <span className="relative flex size-11 items-center justify-center rounded-full border border-line-strong bg-base/70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink-mute">Score {p.score} · {p.updatedAt}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

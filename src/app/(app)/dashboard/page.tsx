"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ButtonLink, Card, ScoreRing, StatusBadge } from "@/components/ui";
import { deleteProjectFootage } from "@/lib/footage-store";
import { CREDITS } from "@/lib/mock-data";
import { isSeededProject, useStore } from "@/lib/store";
import { storageErrorMessage } from "@/lib/storage-errors";

export default function DashboardPage() {
  const { projects, deleteProject } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (projectId: string) => {
      if (isSeededProject(projectId)) return;
      if (
        !confirm(
          "Delete this launch and all locally saved media? This cannot be undone.",
        )
      ) {
        return;
      }
      setDeleteError(null);
      setDeletingId(projectId);
      try {
        await deleteProjectFootage(projectId);
        deleteProject(projectId);
      } catch (e) {
        setDeleteError(storageErrorMessage(e));
      } finally {
        setDeletingId(null);
      }
    },
    [deleteProject],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Your launches</h1>
          <p className="mt-1 text-sm text-ink-mute">
            Credits: <span className="text-ink-soft">{CREDITS.label}</span>
          </p>
        </div>
        <ButtonLink href="/new" size="md">
          + New launch kit
        </ButtonLink>
      </div>

      {deleteError && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {deleteError}
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <Card className="mt-8 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-line px-5 py-3 text-xs uppercase tracking-wider text-ink-mute sm:grid-cols-[1fr_120px_140px_40px]">
            <span>Project</span>
            <span className="text-right sm:text-left">Score</span>
            <span className="text-right">Status</span>
            <span className="sr-only">Actions</span>
          </div>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:grid-cols-[1fr_120px_140px_40px]">
                  <Link href={`/projects/${p.id}/result`} className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="truncate text-sm text-ink-mute">{p.oneLiner}</p>
                  </Link>
                  <span className="text-right font-mono text-lg tabular-nums text-ink sm:text-left">
                    {p.score}
                  </span>
                  <span className="flex justify-end">
                    <StatusBadge status={p.status} />
                  </span>
                  <span className="flex justify-end">
                    {!isSeededProject(p.id) && (
                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => void handleDelete(p.id)}
                        className="rounded-md border border-line px-2 py-1 text-xs text-ink-mute transition-colors hover:border-warn/40 hover:text-warn disabled:opacity-50"
                        aria-label={`Delete ${p.name}`}
                      >
                        {deletingId === p.id ? "…" : "Delete"}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mt-12 text-sm font-medium uppercase tracking-wider text-ink-mute">
        What do you want to create?
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: "Record quick video", d: "Loom-style, but it becomes assets.", href: "/record" },
          { t: "Product presentation", d: "The killer flow. Paste a product.", href: "/new" },
          { t: "Launch video", d: "Hook → pain → transformation → CTA.", href: "/new" },
          { t: "Tutorial", d: "Screen recording → step-by-step guide.", href: "/new" },
          { t: "Interactive demo", d: "Clickable walkthrough with hotspots.", href: "/new" },
          { t: "Turn video into docs", d: "Detect actions → help-center article.", href: "/new" },
        ].map((m) => (
          <Link
            key={m.t}
            href={m.href}
            className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            <p className="font-medium text-ink">{m.t}</p>
            <p className="mt-1 text-sm text-ink-mute">{m.d}</p>
            <span className="mt-3 inline-block text-xs text-accent-ink opacity-0 transition-opacity group-hover:opacity-100">
              Start →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mt-8 flex flex-col items-center gap-4 px-6 py-16 text-center">
      <ScoreRing value={0} size={96} />
      <div>
        <h2 className="text-lg font-medium text-ink">Your first launch kit starts here.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-mute">
          Paste your product URL, upload a recording, or drop screenshots.
          LaunchReel will find the best story and turn it into launch assets.
        </p>
      </div>
      <ButtonLink href="/new">Create launch kit</ButtonLink>
    </Card>
  );
}

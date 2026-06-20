"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useBrandKit } from "@/lib/brand-kit-store";
import { fetchDeck } from "@/lib/ai";
import { buildDeckFromProject } from "@/lib/deck-builder";
import { deckToVideo } from "@/lib/deck-render";
import { deliverableKey, saveBlob, getBlobUrl } from "@/lib/footage-store";
import { downloadBlob } from "@/lib/download-utils";
import { extForMimeType } from "@/lib/director";
import type { Project, Slide } from "@/lib/types";

/**
 * Deck mode — generate a brand-styled pitch/keynote deck from the project,
 * present it fullscreen, and export it to video. Covers pitch/webinar/keynote
 * presentations from the same source as the launch video.
 */
export function DeckPanel({ project }: { project: Project }) {
  const { patchProject } = useStore();
  const brand = useBrandKit();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  const [exporting, setExporting] = useState(false);

  const slides = project.deck ?? [];

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      let result: Slide[];
      try {
        const moments = project.moments.filter((m) => m.keepByDefault).map((m) => m.title);
        const res = await fetchDeck({
          productName: project.name,
          oneLiner: project.oneLiner,
          hook: project.mainHook,
          cta: project.script?.cta,
          audience: project.audience,
          moments,
          weakestPoint: project.audit?.weakestPoint,
        });
        result = res.slides?.length ? res.slides : buildDeckFromProject(project);
      } catch {
        // No key / offline → deterministic deck from project data.
        result = buildDeckFromProject(project);
      }
      patchProject(project.id, { deck: result });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deck failed.");
    } finally {
      setBusy(false);
    }
  }

  async function exportVideo() {
    if (!slides.length) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await deckToVideo(slides, brand, { proxy: true });
      const key = deliverableKey(project.id, "deck");
      await saveBlob(key, project.id, blob, "render");
      const url = (await getBlobUrl(key, "render")) ?? URL.createObjectURL(blob);
      downloadBlob(blob, `launchreel-deck.${extForMimeType(blob.type)}`);
      // keep a previewable url around briefly
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deck export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-ink">Presentation deck</h3>
          <p className="mt-1 text-sm text-ink-mute">
            A brand-styled pitch/keynote deck from your project — present it live or export to video.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void generate()}>
            {busy ? "Writing…" : slides.length ? "Regenerate" : "Generate deck"}
          </Button>
          {slides.length > 0 && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setPresent(true)}>
                Present
              </Button>
              <Button size="sm" variant="secondary" disabled={exporting} onClick={() => void exportVideo()}>
                {exporting ? "Exporting…" : "Export to video"}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-warn">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs uppercase tracking-wider text-ink-mute">
              {s.kind === "title" ? "Cover" : s.kind === "cta" ? "Close" : `Slide ${i + 1}`}
            </p>
            <p className="mt-1 font-medium text-ink">{s.title}</p>
            <ul className="mt-2 space-y-1">
              {s.bullets.map((b, bi) => (
                <li key={bi} className="text-sm text-ink-soft">• {b}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {present && slides.length > 0 && (
        <Presenter slides={slides} onClose={() => setPresent(false)} />
      )}
    </div>
  );
}

function Presenter({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => Math.min(slides.length - 1, v + 1)), [slides.length]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const s = slides[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-6 py-3 text-xs text-ink-mute">
        <span>
          {i + 1} / {slides.length}
        </span>
        <button onClick={onClose} className="hover:text-ink" type="button">
          Close (Esc)
        </button>
      </div>
      <div
        className="flex flex-1 cursor-pointer flex-col justify-center px-[10%]"
        onClick={next}
      >
        <p
          className={
            s.kind === "point"
              ? "text-left text-4xl font-bold text-ink sm:text-6xl"
              : "text-center text-5xl font-bold text-ink sm:text-7xl"
          }
        >
          {s.title}
        </p>
        <ul className={`mt-8 space-y-3 ${s.kind === "point" ? "text-left" : "text-center"}`}>
          {s.bullets.map((b, bi) => (
            <li key={bi} className="text-xl text-ink-soft sm:text-3xl">
              {s.kind === "point" ? "• " : ""}
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-center gap-4 py-4">
        <Button variant="secondary" size="sm" onClick={prev} disabled={i === 0}>
          ← Prev
        </Button>
        <Button size="sm" onClick={next} disabled={i === slides.length - 1}>
          Next →
        </Button>
      </div>
    </div>
  );
}

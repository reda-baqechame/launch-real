"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { useBrandKit } from "@/lib/brand-kit-store";
import { useStore } from "@/lib/store";
import { useFalKey } from "@/lib/ai";
import { usePublicConfig } from "@/lib/hosted-config";
import { CINEMATIC_PRESETS, getPreset } from "@/lib/cinematic-presets";
import { generateAndPolishShot } from "@/lib/cinematic";
import { deliverableKey, getBlobUrl, saveBlob } from "@/lib/footage-store";
import { useFootageUrl } from "@/lib/use-footage-url";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { buildScriptFromMoments } from "@/lib/script-build";
import { useCredits } from "@/lib/use-credits";
import { shouldWatermark } from "@/lib/watermark-policy";
import { renderDeliverables, type DeliverableInputs } from "@/lib/deliverables";
import type { CinematicClipInput } from "@/components/product-video";
import type { DeliverableRender, Project, SeedanceClip, VideoScript } from "@/lib/types";

function scriptFor(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  const kept = project.moments.filter((m) => m.keepByDefault);
  const base = kept.length ? kept : project.moments.slice(0, 3);
  return buildScriptFromMoments(base, project.mainHook);
}

/**
 * Cinematic shots panel — the Higgsfield-style preset surface. Generate on-brand
 * Seedance shots, then weave them into the three flagship deliverables (hero,
 * vertical ad, pitch cut) in one click.
 */
export function CinematicPanel({ project }: { project: Project }) {
  const brand = useBrandKit();
  const { patchProject } = useStore();
  const falKey = useFalKey();
  const cfg = usePublicConfig();
  const credits = useCredits();
  const { url: footageUrl } = useFootageUrl(project.footage);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [makeStatus, setMakeStatus] = useState<string>("");

  const shots = project.cinematicShots ?? [];
  const ready = Boolean(falKey) || cfg?.hosted || cfg?.localFree;
  const applyWatermark = cfg?.localFree ? false : shouldWatermark(credits);

  async function generate(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setBusyId(presetId);
    setError(null);
    setStatus("starting");
    try {
      const clip = await generateAndPolishShot(
        project.id,
        preset,
        { subject: project.name, brand, note: project.mainHook },
        { onStatus: setStatus },
      );
      patchProject(project.id, {
        cinematicShots: [...(project.cinematicShots ?? []), clip],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cinematic shot failed.");
    } finally {
      setBusyId(null);
      setStatus("");
    }
  }

  async function resolveClips(): Promise<CinematicClipInput[]> {
    const rows = await Promise.all(
      shots.map(async (s) => {
        const url = await getBlobUrl(s.blobKey, "seedance");
        return url
          ? { url, placement: s.placement, durationSec: s.durationSec, label: s.label }
          : null;
      }),
    );
    return rows.filter(Boolean) as CinematicClipInput[];
  }

  async function makeDeliverables() {
    setMaking(true);
    setError(null);
    setMakeStatus("Preparing…");
    try {
      const cinematicClips = await resolveClips();
      const imageUrls = project.footage?.screenshotKeys?.length
        ? await loadScreenshotUrls(project.footage.screenshotKeys)
        : [];
      const inputs: DeliverableInputs = {
        footageUrl: footageUrl ?? "",
        clicks: project.footage?.clicks,
        script: scriptFor(project),
        moments: project.moments,
        brand,
        imageUrls: imageUrls.length ? imageUrls : undefined,
        cinematicClips,
        watermark: applyWatermark,
        proxy: true,
      };
      const results = await renderDeliverables(inputs, (cut, pct) =>
        setMakeStatus(`Rendering ${cut}… ${pct}%`),
      );
      const deliverables: DeliverableRender[] = [];
      for (const r of results) {
        const key = deliverableKey(project.id, r.cut);
        await saveBlob(key, project.id, r.blob, "render");
        deliverables.push({
          cut: r.cut,
          label: r.label,
          aspect: r.aspect,
          blobKey: key,
          createdAt: new Date().toISOString(),
          ext: r.ext,
        });
      }
      patchProject(project.id, { deliverables });
      setMakeStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deliverables failed.");
    } finally {
      setMaking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-ink">Cinematic shots</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Director-grade camera moves powered by Seedance — used as intros, b-roll, and
          transitions in your launch video.
          {!ready && " Connect a fal.ai key on the New launch screen to generate."}
          {cfg?.localFree && " Local-free mode renders branded previews instantly."}
        </p>
        {error && <p className="mt-2 text-xs text-warn">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CINEMATIC_PRESETS.map((preset) => (
          <Card key={preset.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{preset.label}</p>
              <Pill>{preset.placement}</Pill>
            </div>
            <p className="text-xs text-ink-mute">{preset.useCase}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Pill>{preset.durationSec}s</Pill>
              <Pill>{preset.recommendedAspect[0]}</Pill>
            </div>
            <Button
              size="sm"
              className="mt-2"
              disabled={!ready || busyId !== null}
              onClick={() => void generate(preset.id)}
            >
              {busyId === preset.id ? status || "Generating…" : "Generate shot"}
            </Button>
          </Card>
        ))}
      </div>

      {shots.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">Generated shots ({shots.length})</p>
            <Button size="sm" disabled={making} onClick={() => void makeDeliverables()}>
              {making ? makeStatus || "Rendering…" : "Make 3 deliverables"}
            </Button>
          </div>
          <p className="text-xs text-ink-mute">
            Weaves your intro/outro shots around the demo to produce a hero video (16:9), a
            vertical ad (9:16), and a pitch cut.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shots.map((shot) => (
              <ShotCard key={shot.id} shot={shot} />
            ))}
          </div>
        </div>
      )}

      {project.deliverables && project.deliverables.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">Deliverables</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.deliverables.map((d) => (
              <DeliverableCard key={d.cut} deliverable={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useBlobUrl(blobKey: string, kind: "seedance" | "render") {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    let active = true;
    void getBlobUrl(blobKey, kind).then((u) => {
      if (active) {
        setUrl(u);
        revoke = u;
      }
    });
    return () => {
      active = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [blobKey, kind]);
  return url;
}

function ShotCard({ shot }: { shot: SeedanceClip }) {
  const url = useBlobUrl(shot.blobKey, "seedance");
  return (
    <Card className="overflow-hidden p-0">
      {url ? (
        <video src={url} controls loop muted playsInline className="aspect-video w-full bg-black" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-base text-xs text-ink-mute">
          Loading…
        </div>
      )}
      <div className="space-y-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">{shot.label}</p>
          <Pill>{shot.aspect}</Pill>
        </div>
        {shot.director && (
          <div>
            <p className={shot.director.pass ? "text-xs text-good" : "text-xs text-warn"}>
              ★ {shot.director.total} · {shot.director.pass ? "passed director" : "needs work"}
            </p>
            {shot.director.notes[0] && (
              <p className="mt-0.5 text-xs text-ink-mute line-clamp-2">{shot.director.notes[0]}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function DeliverableCard({ deliverable }: { deliverable: DeliverableRender }) {
  const url = useBlobUrl(deliverable.blobKey, "render");
  const download = useCallback(() => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `launchreel-${deliverable.cut}.${deliverable.ext ?? "webm"}`;
    a.click();
  }, [url, deliverable.cut, deliverable.ext]);

  return (
    <Card className="overflow-hidden p-0">
      {url ? (
        <video
          src={url}
          controls
          playsInline
          className={
            deliverable.aspect === "9:16"
              ? "mx-auto aspect-[9/16] max-h-80 bg-black"
              : "aspect-video w-full bg-black"
          }
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-base text-xs text-ink-mute">
          Loading…
        </div>
      )}
      <div className="flex items-center justify-between gap-2 p-3">
        <div>
          <p className="text-sm font-medium text-ink">{deliverable.label}</p>
          <p className="text-xs text-ink-mute">{deliverable.aspect}</p>
        </div>
        <Button size="sm" variant="secondary" disabled={!url} onClick={download}>
          Download
        </Button>
      </div>
    </Card>
  );
}

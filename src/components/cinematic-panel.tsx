"use client";

import { useEffect, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { useBrandKit } from "@/lib/brand-kit-store";
import { useStore } from "@/lib/store";
import { useFalKey } from "@/lib/ai";
import { usePublicConfig } from "@/lib/hosted-config";
import { CINEMATIC_PRESETS, getPreset } from "@/lib/cinematic-presets";
import { generateCinematicShot } from "@/lib/cinematic";
import { getBlobUrl } from "@/lib/footage-store";
import type { Project, SeedanceClip } from "@/lib/types";

/**
 * Cinematic shots panel — the Higgsfield-style preset surface. Pick a camera
 * move, generate an on-brand Seedance shot (or a branded preview in local-free
 * mode), and keep it on the project for the edit.
 */
export function CinematicPanel({ project }: { project: Project }) {
  const brand = useBrandKit();
  const { patchProject } = useStore();
  const falKey = useFalKey();
  const cfg = usePublicConfig();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const shots = project.cinematicShots ?? [];
  const ready = Boolean(falKey) || cfg?.hosted || cfg?.localFree;

  async function generate(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setBusyId(presetId);
    setError(null);
    setStatus("starting");
    try {
      const clip = await generateCinematicShot(
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-ink">Cinematic shots</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Director-grade camera moves powered by Seedance — use them as intros, b-roll, and
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
        <div>
          <p className="text-sm font-medium text-ink">Generated shots ({shots.length})</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shots.map((shot) => (
              <ShotCard key={shot.id} shot={shot} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShotCard({ shot }: { shot: SeedanceClip }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let active = true;
    void getBlobUrl(shot.blobKey, "seedance").then((u) => {
      if (active) {
        setUrl(u);
        revoke = u;
      }
    });
    return () => {
      active = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [shot.blobKey]);

  return (
    <Card className="overflow-hidden p-0">
      {url ? (
        <video src={url} controls loop muted playsInline className="aspect-video w-full bg-black" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-base text-xs text-ink-mute">
          Loading…
        </div>
      )}
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="text-sm font-medium text-ink">{shot.label}</p>
        <Pill>{shot.aspect}</Pill>
      </div>
    </Card>
  );
}

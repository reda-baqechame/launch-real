"use client";

import { useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { useBrandKit } from "@/lib/brand-kit-store";
import { renderProductVideo, type CinematicClipInput } from "@/components/product-video";
import { buildScriptFromMoments } from "@/lib/script-build";
import { avatarKey, deliverableKey, getBlobUrl, saveBlob } from "@/lib/footage-store";
import { useFootageUrl } from "@/lib/use-footage-url";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { downloadBlob } from "@/lib/download-utils";
import { PLATFORM_SPECS, type PlatformSpec } from "@/lib/platform-specs";
import { makeThumbnail } from "@/lib/thumbnail";
import type { Project, VideoScript } from "@/lib/types";

function scriptFor(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  const kept = project.moments.filter((m) => m.keepByDefault);
  return buildScriptFromMoments(kept.length ? kept : project.moments.slice(0, 3), project.mainHook);
}

/** Platform-spec exports + thumbnail generator. */
export function ExportPanel({ project }: { project: Project }) {
  const brand = useBrandKit();
  const { url: footageUrl } = useFootageUrl(project.footage);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function resolveInputs() {
    const imageUrls = project.footage?.screenshotKeys?.length
      ? await loadScreenshotUrls(project.footage.screenshotKeys)
      : [];
    const cinematicClips = (
      await Promise.all(
        (project.cinematicShots ?? []).map(async (s) => {
          const url = await getBlobUrl(s.blobKey, "seedance");
          return url
            ? ({ url, placement: s.placement, durationSec: s.durationSec, label: s.label } as CinematicClipInput)
            : null;
        }),
      )
    ).filter(Boolean) as CinematicClipInput[];
    const avatarClipUrl = project.avatar?.enabled
      ? (await getBlobUrl(avatarKey(project.id), "avatar")) ?? undefined
      : undefined;
    return { imageUrls, cinematicClips, avatarClipUrl };
  }

  async function exportFor(spec: PlatformSpec) {
    setBusy(spec.id);
    setError(null);
    setStatus(`Rendering ${spec.label}…`);
    try {
      const { imageUrls, cinematicClips, avatarClipUrl } = await resolveInputs();
      const out = await renderProductVideo({
        footageUrl: footageUrl ?? "",
        clicks: project.footage?.clicks,
        script: scriptFor(project),
        moments: project.moments,
        brand,
        aspects: [spec.aspect],
        imageUrls: imageUrls.length ? imageUrls : undefined,
        cinematicClips,
        avatarClipUrl,
        momentLimit: spec.momentLimit,
        maxDurationSec: spec.maxDurationSec,
        watermark: false,
        proxy: true,
      });
      if (out[0]) {
        await saveBlob(deliverableKey(project.id, `platform-${spec.id}`), project.id, out[0].blob, "render");
        downloadBlob(out[0].blob, `launchreel-${spec.id}.${out[0].ext}`);
      }
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function thumbnail() {
    setBusy("thumb");
    setError(null);
    try {
      const blob = await makeThumbnail(brand, project.mainHook || project.name, project.oneLiner);
      downloadBlob(blob, `launchreel-thumbnail.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thumbnail failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-ink">Export for platforms</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Render your video to each platform&apos;s preferred aspect and length, plus a branded
          thumbnail. {status && <span className="text-ink-soft">{status}</span>}
        </p>
        {error && <p className="mt-2 text-xs text-warn">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_SPECS.map((spec) => (
          <Card key={spec.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{spec.label}</p>
              <Pill>{spec.aspect}</Pill>
            </div>
            <p className="text-xs text-ink-mute">Up to {spec.maxDurationSec}s</p>
            <Button size="sm" className="mt-1" disabled={busy !== null} onClick={() => void exportFor(spec)}>
              {busy === spec.id ? "Rendering…" : "Export"}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-ink">Thumbnail</p>
          <p className="text-xs text-ink-mute">A branded 16:9 title card (PNG) for posts and embeds.</p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void thumbnail()}>
          {busy === "thumb" ? "Making…" : "Download thumbnail"}
        </Button>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useBrandKit } from "@/lib/brand-kit-store";
import { fetchTranslate, fetchTts } from "@/lib/ai";
import { mergeTtsBlobs } from "@/lib/tts-merge";
import { renderProductVideo, type CinematicClipInput } from "@/components/product-video";
import { buildScriptFromMoments } from "@/lib/script-build";
import { avatarKey, deliverableKey, getBlobUrl, saveBlob } from "@/lib/footage-store";
import { useFootageUrl } from "@/lib/use-footage-url";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { downloadBlob } from "@/lib/download-utils";
import type { Project, VideoScript } from "@/lib/types";

const LANG_CODES: Record<string, string> = {
  Spanish: "es",
  French: "fr",
  German: "de",
  Portuguese: "pt",
  Italian: "it",
  Arabic: "ar",
  Japanese: "ja",
  Hindi: "hi",
  English: "en",
};

function scriptFor(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  const kept = project.moments.filter((m) => m.keepByDefault);
  return buildScriptFromMoments(kept.length ? kept : project.moments.slice(0, 3), project.mainHook);
}

/** Localize a launch video: translated voiceover (dubbed) + burned-in captions. */
export function LocalizeVideoPanel({ project }: { project: Project }) {
  const { patchProject } = useStore();
  const brand = useBrandKit();
  const { url: footageUrl } = useFootageUrl(project.footage);
  const langs = Array.from(
    new Set([...(brand.localizedLanguages ?? []), "Spanish", "French", "Arabic"]),
  );
  const [language, setLanguage] = useState(langs[0] ?? "Spanish");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultKey, setResultKey] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResultKey(null);
    try {
      const base = scriptFor(project);
      setStatus("translating");
      const tr = await fetchTranslate({
        hook: base.hook,
        cta: base.cta,
        lines: base.lines.map((l) => l.text),
        language,
      });
      const localizedScript: VideoScript = {
        ...base,
        hook: tr.hook || base.hook,
        cta: tr.cta || base.cta,
        lines: base.lines.map((l, i) => ({ ...l, text: tr.lines[i] ?? l.text })),
      };

      // Dubbed voiceover (best-effort — needs a TTS key/server).
      const code = LANG_CODES[language] ?? "en";
      let narrationUrl: string | undefined;
      try {
        setStatus("dubbing voiceover");
        const blobs: Blob[] = [];
        for (const line of localizedScript.lines) {
          if (line.text.trim()) blobs.push(await fetchTts(line.text, code));
        }
        if (blobs.length) narrationUrl = URL.createObjectURL(await mergeTtsBlobs(blobs));
      } catch {
        // No TTS — render with translated captions + music only.
      }

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

      setStatus("rendering");
      const out = await renderProductVideo({
        footageUrl: footageUrl ?? "",
        clicks: project.footage?.clicks,
        script: localizedScript,
        moments: project.moments,
        brand,
        aspects: ["16:9"],
        imageUrls: imageUrls.length ? imageUrls : undefined,
        narrationUrl,
        cinematicClips,
        avatarClipUrl,
        watermark: false,
        proxy: true,
      });
      if (out[0]) {
        const key = deliverableKey(project.id, `lang-${code}`);
        await saveBlob(key, project.id, out[0].blob, "render");
        downloadBlob(out[0].blob, `launchreel-${code}.${out[0].ext}`);
        setResultKey(key);
        patchProject(project.id, {
          language,
        });
      }
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Localization failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-ink">Dub &amp; subtitle</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Translate the voiceover and burn in translated captions to ship your video in another
          language. Voiceover is dubbed when a TTS voice is connected.
        </p>
      </div>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm text-ink-soft">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="ml-2 rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
          >
            {langs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={busy} onClick={() => void run()}>
          {busy ? status || "Working…" : "Translate & render"}
        </Button>
        {error && <span className="text-xs text-warn">{error}</span>}
        {resultKey && !busy && <span className="text-xs text-good">Localized video saved ✓</span>}
      </Card>
    </div>
  );
}

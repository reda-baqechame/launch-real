"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  analyzeToMoments,
  fetchAnalyze,
  fetchCaptions,
  fetchJudge,
  fetchScript,
  fetchTranscript,
  fetchTts,
  getKey,
  getTtsKey,
  getTtsProvider,
} from "@/lib/ai";
import { formatTimecode, grabFrame } from "@/lib/director";
import { getBlob, getBlobUrl, narrationKey, renderKey, saveBlob, saveRender, socialClipKey, teaserGifKey, variantRenderKey } from "@/lib/footage-store";
import { renderTeaserGif } from "@/lib/teaser-gif";
import { loadScreenshotUrls, momentsFromScreenshots } from "@/lib/screenshot-loader";
import { buildLaunchKitAssets, drawPhPoster } from "@/lib/launch-kit-build";
import { planSocialClips } from "@/lib/social-clips";
import { renderAllSocialClips } from "@/lib/social-clip-render";
import { mapScriptResponse, scriptSummary } from "@/lib/script-utils";
import { mergeTtsBlobs } from "@/lib/tts-merge";
import { renderProductVideo } from "@/components/product-video";
import { useStore } from "@/lib/store";
import { buildScriptFromMoments } from "@/lib/script-build";
import type { DemoMoment, LaunchAsset, Project } from "@/lib/types";

const ROLE_STYLES: Partial<Record<DemoMoment["role"], string>> = {
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
  "Drafting script variants…",
  "Rendering A/B previews…",
  "Quality judge picks the winner…",
  "Recording the voiceover…",
  "Rendering your video…",
  "Packaging social clips & PH kit…",
  "Writing launch copy…",
];

function screenshotMomentsIfNeeded(project: Project): DemoMoment[] | null {
  if (
    project.footage?.kind === "screenshots" &&
    project.footage.screenshotKeys?.length &&
    project.moments.every((m) => !m.thumbDataUrl) &&
    !getKey()
  ) {
    return momentsFromScreenshots(project.footage.screenshotKeys);
  }
  return null;
}

export function MomentReview({ project }: { project: Project }) {
  const router = useRouter();
  const {
    attachMoments,
    attachScript,
    attachRenders,
    attachJudge,
    attachCaptions,
    attachAssets,
    patchProject,
  } = useStore();

  const ssInit = screenshotMomentsIfNeeded(project);
  const [moments, setMoments] = useState<DemoMoment[]>(ssInit ?? project.moments);
  const [kept, setKept] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (ssInit ?? project.moments).map((m) => [m.id, ssInit ? true : m.keepByDefault]),
    ),
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const analysisStarted = useRef(false);
  const [appSummary, setAppSummary] = useState(project.oneLiner);

  const runAnalysis = useCallback(async () => {
    if (!project.footage?.blobKey || !getKey()) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const footageUrl = await getBlobUrl(project.footage.blobKey, "footage");
      if (!footageUrl) throw new Error("Footage not found.");

      const video = document.createElement("video");
      video.src = footageUrl;
      video.muted = true;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Could not load footage."));
      });

      const count = 10;
      const duration = video.duration;
      const frames: { tSec: number; dataUrl: string }[] = [];
      const thumbMap = new Map<number, string>();

      for (let i = 0; i < count; i++) {
        const tSec = (duration * (i + 0.5)) / count;
        const dataUrl = await grabFrame(video, tSec);
        frames.push({ tSec, dataUrl });
        thumbMap.set(Math.round(tSec), dataUrl);
      }

      let transcript: string | undefined;
      if (project.footage.hasAudio && getTtsKey() && getTtsProvider() === "openai") {
        try {
          const blob = await getBlob(project.footage.blobKey, "footage");
          if (blob) transcript = await fetchTranscript(blob);
        } catch {
          /* transcription optional */
        }
      }

      const result = await fetchAnalyze({
        contextLine: project.oneLiner,
        hasAudio: project.footage.hasAudio,
        frames,
        transcript,
      });
      setAppSummary(result.app_summary);
      const detected = analyzeToMoments(result, thumbMap);
      setMoments(detected);
      setKept(Object.fromEntries(detected.map((m) => [m.id, m.keepByDefault])));
      attachMoments(project.id, detected);
      URL.revokeObjectURL(footageUrl);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }, [project, attachMoments]);

  const attachedScreenshotMoments = useRef(false);
  useEffect(() => {
    if (!ssInit || attachedScreenshotMoments.current) return;
    attachedScreenshotMoments.current = true;
    attachMoments(project.id, ssInit);
  }, [ssInit, project.id, attachMoments]);

  useEffect(() => {
    if (
      project.footage?.blobKey &&
      getKey() &&
      project.moments.every((m) => !m.thumbDataUrl) &&
      !analyzing &&
      !analysisStarted.current
    ) {
      analysisStarted.current = true;
      void runAnalysis();
    }
  }, [project.footage?.blobKey, project.moments, runAnalysis, analyzing]);

  const keptCount = Object.values(kept).filter(Boolean).length;

  async function generate() {
    if (!project.footage?.blobKey) {
      router.push(`/projects/${project.id}/result`);
      return;
    }
    if (keptCount === 0) {
      setGenError("Keep at least one moment before generating.");
      return;
    }

    setGenerating(true);
    setGenError(null);
    setStep(0);

    try {
      const footageUrl = await getBlobUrl(project.footage.blobKey, "footage");
      if (!footageUrl) throw new Error("Footage missing.");

      let imageUrls: string[] | undefined;
      if (project.footage.kind === "screenshots" && project.footage.screenshotKeys?.length) {
        imageUrls = await loadScreenshotUrls(project.footage.screenshotKeys);
      }

      const selected = moments
        .filter((m) => kept[m.id])
        .map((m) => ({ ...m, keepByDefault: true }));
      const updatedMoments = moments.map((m) => ({
        ...m,
        keepByDefault: Boolean(kept[m.id]),
      }));
      attachMoments(project.id, updatedMoments);

      let script = project.script;

      if (getKey()) {
        setStep(0);
        const altAngle = project.angles.find((a) => a.id !== project.selectedAngleId);
        const altHook = altAngle?.hook ?? project.audit.recommendedHook;

        const [resA, resB] = await Promise.all([
          fetchScript({
            mode: project.outputMode ?? "marketing",
            appSummary,
            moments: selected,
            contextLine: project.oneLiner,
            language: project.language ?? "en",
            hook: project.mainHook,
          }),
          fetchScript({
            mode: project.outputMode ?? "marketing",
            appSummary,
            moments: selected,
            contextLine: project.oneLiner,
            language: project.language ?? "en",
            hook: altHook,
          }),
        ]);

        const scriptA = mapScriptResponse(resA);
        const scriptB = mapScriptResponse(resB);

        setStep(1);
        try {
          const [proxyA, proxyB] = await Promise.all([
            renderProductVideo({
              footageUrl,
              imageUrls,
              clicks: project.footage.clicks,
              script: scriptA,
              moments: selected,
              aspects: ["16:9"],
              watermark: true,
              proxy: true,
              maxDurationSec: 18,
            }),
            renderProductVideo({
              footageUrl,
              imageUrls,
              clicks: project.footage.clicks,
              script: scriptB,
              moments: selected,
              aspects: ["16:9"],
              watermark: true,
              proxy: true,
              maxDurationSec: 18,
            }),
          ]);

          const keyA = variantRenderKey(project.id, "a");
          const keyB = variantRenderKey(project.id, "b");
          await saveRender(project.id, "variant-a", proxyA[0].blob);
          await saveRender(project.id, "variant-b", proxyB[0].blob);
          proxyA.forEach((r) => URL.revokeObjectURL(r.url));
          proxyB.forEach((r) => URL.revokeObjectURL(r.url));

          patchProject(project.id, {
            abPreviews: [
              { variant: 1, blobKey: keyA, hook: scriptA.hook },
              { variant: 2, blobKey: keyB, hook: scriptB.hook },
            ],
          });
        } catch {
          /* A/B preview optional */
        }

        setStep(2);
        try {
          const judge = await fetchJudge([
            { variant: 1, summary: scriptSummary(scriptA) },
            { variant: 2, summary: scriptSummary(scriptB) },
          ]);
          script = judge.winner === 2 ? scriptB : scriptA;
          attachJudge(project.id, { ...judge, winningHook: script.hook });
        } catch {
          script = scriptA;
        }
        attachScript(project.id, script);
      } else {
        script = buildScriptFromMoments(selected, project.mainHook);
        attachScript(project.id, script);
        setStep(2);
      }

      setStep(3);
      let narrationUrl: string | null = null;
      if (getTtsKey() && script.lines.length > 0) {
        const blobs: Blob[] = [];
        for (const line of script.lines) {
          blobs.push(await fetchTts(line.text, project.language ?? "en"));
        }
        const combined = await mergeTtsBlobs(blobs);
        const nKey = narrationKey(project.id);
        await saveBlob(nKey, project.id, combined, "narration");
        narrationUrl = URL.createObjectURL(combined);
      }

      setStep(4);
      const results = await renderProductVideo({
        footageUrl,
        imageUrls,
        clicks: project.footage.clicks,
        script: script!,
        moments: selected,
        aspects: ["16:9", "9:16", "1:1"],
        narrationUrl,
        watermark: true,
        proxy: false,
      });

      const renders = await Promise.all(
        results.map(async (r) => {
          const key = renderKey(project.id, r.aspect);
          await saveRender(project.id, r.aspect, r.blob);
          return { aspect: r.aspect, blobKey: key, createdAt: new Date().toISOString() };
        }),
      );
      attachRenders(project.id, renders);
      results.forEach((r) => URL.revokeObjectURL(r.url));

      try {
        const heroKey = renders.find((r) => r.aspect === "16:9")?.blobKey;
        if (heroKey) {
          const heroBlob = await getBlob(heroKey, "render");
          if (heroBlob) {
            const heroUrl = URL.createObjectURL(heroBlob);
            const gifBlob = await renderTeaserGif(heroUrl);
            URL.revokeObjectURL(heroUrl);
            const gKey = teaserGifKey(project.id);
            await saveBlob(gKey, project.id, gifBlob, "render");
            attachAssets(project.id, {
              videos: project.assets.videos.map((v) =>
                v.id === "v4" ? { ...v, blobKey: gKey, meta: "5s · muted autoplay · GIF" } : v,
              ),
            });
          }
        }
      } catch {
        /* teaser GIF optional */
      }

      setStep(5);
      const clipPlans = planSocialClips(selected, script!.hook, script!.cta);
      let socialAssets: LaunchAsset[] = clipPlans.map((plan) => ({
        id: plan.id,
        title: `Clip — ${plan.label}`,
        meta: `9:16 · ${plan.platform}`,
      }));

      try {
        const clipResults = await renderAllSocialClips({
          footageUrl,
          imageUrls,
          plans: clipPlans,
          ctaText: script!.cta,
          clicks: project.footage.clicks,
          watermark: true,
        });
        socialAssets = await Promise.all(
          clipResults.map(async ({ plan, blob }) => {
            const key = socialClipKey(project.id, plan.id);
            await saveBlob(key, project.id, blob, "render");
            return {
              id: plan.id,
              title: `Clip — ${plan.label}`,
              meta: `9:16 · ${plan.platform}`,
              blobKey: key,
            };
          }),
        );
      } catch {
        /* social clip render optional */
      }
      attachAssets(project.id, { social: socialAssets });

      try {
        const kit = await buildLaunchKitAssets(footageUrl, project, selected, { imageUrls });
        if (kit.screenshots[0]) {
          const poster = await drawPhPoster(
            kit.screenshots[0].dataUrl,
            project.name,
            script!.hook,
          );
          kit.productHunt[0] = { ...kit.productHunt[0], body: poster };
        }

        const heroKey = renders.find((r) => r.aspect === "16:9")?.blobKey;
        if (heroKey) {
          kit.productHunt = kit.productHunt.map((a) =>
            a.id === "ph-video" ? { ...a, blobKey: heroKey, meta: "45–60s · works muted · 16:9" } : a,
          );
        }

        attachAssets(project.id, { productHunt: kit.productHunt, social: socialAssets });
      } catch {
        /* PH kit optional — social already saved */
      }

      setStep(6);
      if (getKey()) {
        try {
          const captions = await fetchCaptions(
            script!,
            project.name,
            clipPlans.map((p) => ({ id: p.id, label: p.label, platform: p.platform })),
          );
          attachCaptions(project.id, captions);

          const captionById = new Map(captions.socialClips?.map((c) => [c.id, c.caption]) ?? []);
          attachAssets(project.id, {
            social: socialAssets.map((a) => ({
              ...a,
              body: captionById.get(a.id) ?? a.body,
            })),
            copy: [
              { id: "x", title: "X post", body: captions.x },
              { id: "li", title: "LinkedIn post", body: captions.linkedin },
              { id: "ph", title: "PH first comment", body: captions.phFirstComment },
            ],
          });
        } catch {
          /* captions optional */
        }
      }

      URL.revokeObjectURL(footageUrl);
      if (narrationUrl) URL.revokeObjectURL(narrationUrl);
      router.push(`/projects/${project.id}/result`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed.");
      setGenerating(false);
    }
  }

  if (analyzing) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-xl flex-col items-center justify-center text-center">
        <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <p className="mt-4 text-sm text-ink-mute">Analyzing your footage for the best moments…</p>
      </div>
    );
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
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  i < step ? "bg-good/20 text-good" : i === step ? "bg-accent/20 text-accent-ink animate-pulse-soft" : "bg-surface-2 text-ink-faint",
                )}
              >
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
      {analyzeError && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {analyzeError}
        </p>
      )}

      {genError && (
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {genError}
        </p>
      )}

      {project.footage && !getKey() && (
        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-mute">
          Connect an Anthropic key on /new to auto-detect moments from your recording. Using template moments for now.
        </p>
      )}

      {project.footage?.hasAudio && getTtsProvider() !== "openai" && (
        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-mute">
          Connect OpenAI TTS on /new to transcribe narrated recordings before moment detection.
        </p>
      )}

      {project.footage && getKey() && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => void runAnalysis()}>
            Re-analyze footage
          </Button>
        </div>
      )}

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
              {m.thumbDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.thumbDataUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-lg border border-line object-cover"
                />
              ) : null}
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
                  <span className="font-mono text-xs text-ink-mute">
                    {m.startSec != null ? formatTimecode(m.startSec) : m.timecode}
                  </span>
                  <span className="font-medium text-ink">{m.title}</span>
                  {m.wowScore != null && (
                    <span className="text-xs text-ink-mute">wow {m.wowScore}</span>
                  )}
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
        <Button onClick={() => void generate()} size="lg" disabled={keptCount === 0}>
          Make the launch kit →
        </Button>
      </div>
    </>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  aspectDimensions,
  buildEditTimeline,
  buildScreenshotClips,
  captionLinesFromTimeline,
  captionsAtTime,
  drawCaptionBar,
  drawIntroCard,
  drawKenBurnsImage,
  drawOutroCard,
  drawZoomedFrame,
  outputDurationFromTimeline,
  seekVideo,
  segmentAtOutputTime,
  wordCaptions,
  zoomAtTime,
  type AspectRatio,
  type EditSegment,
  type KenBurnsClip,
} from "@/lib/director";
import { loadImages } from "@/lib/screenshot-loader";
import { getBrandKit, useBrandKit } from "@/lib/brand-kit-store";
import type { BrandKit, ClickEvent, DemoMoment, VideoScript } from "@/lib/types";

const FPS = 30;
const INTRO_SEC = 2;
const OUTRO_SEC = 3;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

async function loadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return await ctx.decodeAudioData(ab);
  } catch {
    return null;
  }
}

function createAmbientPad(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, t / 2) * Math.min(1, (durationSec - t) / 2);
      data[i] =
        env *
        0.08 *
        (Math.sin(2 * Math.PI * 55 * t) * 0.5 +
          Math.sin(2 * Math.PI * 110 * t) * 0.3 +
          Math.sin(2 * Math.PI * 220 * t) * 0.2);
    }
  }
  return buffer;
}

export interface RenderResult {
  aspect: AspectRatio;
  blob: Blob;
  url: string;
}

export interface ProductVideoStudioProps {
  footageUrl: string;
  clicks?: ClickEvent[];
  script: VideoScript;
  moments?: DemoMoment[];
  brand?: BrandKit;
  aspects?: AspectRatio[];
  narrationUrl?: string | null;
  watermark?: boolean;
  proxy?: boolean;
  imageUrls?: string[];
  maxDurationSec?: number;
  onProgress?: (pct: number) => void;
  onComplete?: (results: RenderResult[]) => void;
}

export function ProductVideoStudio({
  footageUrl,
  clicks = [],
  script,
  moments = [],
  brand: brandProp,
  aspects = ["16:9", "9:16", "1:1"],
  narrationUrl,
  watermark = true,
  onProgress,
  onComplete,
}: ProductVideoStudioProps) {
  const savedBrand = useBrandKit();
  const brandKit = brandProp ?? savedBrand;
  const [phase, setPhase] = useState<"idle" | "preview" | "rendering" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RenderResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const runRender = useCallback(
    async (useProxy: boolean) => {
      setError(null);
      setPhase("rendering");
      setProgress(0);
      const video = videoRef.current;
      if (!video) return;

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Failed to load footage."));
          if (video.readyState >= 1) resolve();
        });

        const out = await renderProductVideo({
          footageUrl,
          clicks,
          script,
          moments,
          brand: brandKit,
          aspects,
          narrationUrl,
          watermark,
          proxy: useProxy,
          onProgress: (pct) => {
            setProgress(pct);
            onProgress?.(pct);
          },
        });

        setResults(out);
        setPhase("done");
        onComplete?.(out);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Render failed.");
        setPhase("idle");
      }
    },
    [aspects, brandKit, clicks, footageUrl, moments, narrationUrl, onComplete, onProgress, script, watermark],
  );

  const segmentCount =
    script.shotList?.length ??
    moments.filter((m) => m.keepByDefault).length;

  return (
    <div>
      <video ref={videoRef} src={footageUrl} muted playsInline preload="auto" className="hidden" />

      {phase === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void runRender(true)} size="lg" variant="secondary">
            Preview cut ({segmentCount || "auto"} moments)
          </Button>
          <Button onClick={() => void runRender(false)} size="lg">
            Render full quality
          </Button>
        </div>
      )}

      {(phase === "preview" || phase === "rendering") && (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-ink-mute">
            {phase === "preview" ? "Previewing" : "Rendering"} cut… {progress}%
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      {segmentCount > 0 && phase === "idle" && (
        <p className="mt-2 text-xs text-ink-mute">
          Cuts to {segmentCount} selected moments — not the full raw recording.
        </p>
      )}

      {phase === "done" && results.length > 0 && (
        <div className="mt-4 space-y-4">
          {results.map((r) => (
            <div key={r.aspect} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Pill>{r.aspect}</Pill>
                <a
                  href={r.url}
                  download={`launchreel-${r.aspect.replace(":", "x")}.webm`}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-soft"
                >
                  Download
                </a>
              </div>
              <video
                src={r.url}
                controls
                className={cn(
                  "mt-3 w-full rounded-lg border border-line bg-black",
                  r.aspect === "9:16" ? "max-w-xs mx-auto" : "",
                )}
              />
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setPhase("idle")}>
            Render again
          </Button>
        </div>
      )}
    </div>
  );
}

interface RenderAspectOpts {
  video?: HTMLVideoElement;
  images?: HTMLImageElement[];
  kbClips?: KenBurnsClip[];
  renderMoments?: DemoMoment[];
  w: number;
  h: number;
  totalSec: number;
  introSec: number;
  outroSec: number;
  segments: EditSegment[];
  script: VideoScript;
  captions: ReturnType<typeof wordCaptions>;
  brand: BrandKit;
  watermark: boolean;
  narrationUrl?: string | null;
  onFrame?: (frame: number, totalFrames: number) => void;
}

async function renderAspect(opts: RenderAspectOpts): Promise<Blob> {
  const {
    video,
    images = [],
    kbClips = [],
    renderMoments = [],
    w,
    h,
    totalSec,
    introSec,
    outroSec,
    segments,
    script,
    captions,
    brand,
    watermark,
    narrationUrl,
    onFrame,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const totalSamples = Math.ceil(totalSec * audioCtx.sampleRate);
  const mixBuffer = audioCtx.createBuffer(2, totalSamples, audioCtx.sampleRate);

  const musicBuf =
    (await loadAudioBuffer(audioCtx, "/music/bed.mp3")) ??
    createAmbientPad(audioCtx, totalSec);
  copyBufferToMix(audioCtx, musicBuf, mixBuffer, 0, 0.12);

  if (narrationUrl) {
    const narrBuf = await loadAudioBuffer(audioCtx, narrationUrl);
    if (narrBuf) copyBufferToMix(audioCtx, narrBuf, mixBuffer, introSec, 0.85);
  }

  const mixSource = audioCtx.createBufferSource();
  mixSource.buffer = mixBuffer;
  mixSource.connect(dest);

  const canvasStream = canvas.captureStream(FPS);
  dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    canvasStream,
    mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined,
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType ?? "video/webm" }));
  });

  recorder.start();
  mixSource.start(0);

  const totalFrames = Math.ceil(totalSec * FPS);
  let lastSourceTime = -1;

  for (let f = 0; f < totalFrames; f++) {
    const tSec = f / FPS;
    onFrame?.(f, totalFrames);

    if (tSec < introSec) {
      drawIntroCard(ctx, script.hook, w, h, brand.primaryColor, brand.backgroundColor);
    } else if (tSec >= totalSec - outroSec) {
      drawOutroCard(ctx, script.cta, w, h, brand.primaryColor, brand.backgroundColor, watermark);
    } else {
      const hit = segmentAtOutputTime(segments, tSec);
      if (hit) {
        const { segment, progress } = hit;

        if (images.length > 0) {
          const momentIdx = renderMoments.findIndex((m) => m.id === segment.momentId);
          const imgIdx =
            momentIdx >= 0 ? momentIdx % images.length : Math.floor(progress * images.length) % images.length;
          const clip = kbClips[imgIdx] ?? kbClips[0];
          if (clip && images[imgIdx]) {
            drawKenBurnsImage(ctx, images[imgIdx], clip, progress, w, h, brand.backgroundColor);
          }
        } else if (video) {
          const srcDur = segment.sourceEndSec - segment.sourceStartSec;
          const sourceTime = segment.sourceStartSec + progress * srcDur;

          if (Math.abs(sourceTime - lastSourceTime) > 0.03) {
            await seekVideo(video, sourceTime);
            lastSourceTime = sourceTime;
          }

          const localMs = progress * segment.outputDurationSec * 1000;
          const zoom = zoomAtTime(segment.zoomKeyframes, localMs);

          ctx.fillStyle = brand.backgroundColor;
          ctx.fillRect(0, 0, w, h);
          drawZoomedFrame(ctx, video, zoom, w, h);
        }

        drawCaptionBar(ctx, captionsAtTime(captions, tSec), w, h, brand.accentColor);
      } else {
        ctx.fillStyle = brand.backgroundColor;
        ctx.fillRect(0, 0, w, h);
      }
    }

    await sleep(1000 / FPS);
  }

  recorder.stop();
  mixSource.stop();
  await audioCtx.close();
  return done;
}

function copyBufferToMix(
  ctx: AudioContext,
  src: AudioBuffer,
  dest: AudioBuffer,
  offsetSec: number,
  gain: number,
) {
  const offset = Math.floor(offsetSec * ctx.sampleRate);
  for (let ch = 0; ch < Math.min(src.numberOfChannels, dest.numberOfChannels); ch++) {
    const srcData = src.getChannelData(ch);
    const destData = dest.getChannelData(ch);
    for (let i = 0; i < srcData.length && offset + i < destData.length; i++) {
      destData[offset + i] += srcData[i] * gain;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildTimeline(
  script: VideoScript,
  moments: DemoMoment[],
  clicks: ClickEvent[],
  footageDurSec: number,
) {
  const segments = buildEditTimeline(
    moments,
    script,
    clicks,
    INTRO_SEC,
    script.shotList,
    footageDurSec,
  );
  const captionLines =
    segments.length > 0 ? captionLinesFromTimeline(segments) : script.lines;
  const totalSec = outputDurationFromTimeline(segments, INTRO_SEC, OUTRO_SEC);
  return { segments, captionLines, totalSec };
}

/** Render without UI — used by moment-review generate flow. */
export async function renderProductVideo(
  opts: Omit<ProductVideoStudioProps, "onComplete"> & {
    onProgress?: (pct: number) => void;
  },
): Promise<RenderResult[]> {
  const images = opts.imageUrls?.length ? await loadImages(opts.imageUrls) : [];
  const kbClips =
    images.length > 0 ?
      buildScreenshotClips(opts.imageUrls!, 4)
    : [];

  let video: HTMLVideoElement | undefined;
  let footageDur = images.length > 0 ? images.length * 5 : 60;

  if (opts.footageUrl && images.length === 0) {
    video = document.createElement("video");
    video.src = opts.footageUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise<void>((resolve, reject) => {
      video!.onloadedmetadata = () => resolve();
      video!.onerror = () => reject(new Error("Footage load failed"));
    });
    footageDur = video.duration || footageDur;
  }

  const aspects = opts.aspects ?? ["16:9"];
  const brand = opts.brand ?? getBrandKit();
  const clicks = opts.clicks ?? [];
  const moments = opts.moments ?? [];
  const timeline = buildTimeline(
    opts.script,
    moments,
    clicks,
    footageDur,
  );
  const { segments, captionLines } = timeline;
  let { totalSec } = timeline;
  if (opts.maxDurationSec) totalSec = Math.min(totalSec, opts.maxDurationSec);

  const captions = wordCaptions(captionLines);
  const results: RenderResult[] = [];

  for (let ai = 0; ai < aspects.length; ai++) {
    const aspect = aspects[ai];
    const { w, h } = aspectDimensions(aspect, opts.proxy ? 540 : 1080);
    const blob = await renderAspect({
      video,
      images,
      kbClips,
      renderMoments: moments,
      w,
      h,
      totalSec,
      introSec: INTRO_SEC,
      outroSec: OUTRO_SEC,
      segments,
      script: opts.script,
      captions,
      brand,
      watermark: opts.watermark ?? true,
      narrationUrl: opts.narrationUrl,
      onFrame: (frame, totalFrames) => {
        const overall = ((ai + frame / totalFrames) / aspects.length) * 100;
        opts.onProgress?.(Math.round(overall));
      },
    });
    results.push({ aspect, blob, url: URL.createObjectURL(blob) });
  }
  return results;
}

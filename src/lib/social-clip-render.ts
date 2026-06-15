import { getBrandKit } from "./brand-kit-store";
import {
  aspectDimensions,
  buildZoomKeyframes,
  captionsAtTime,
  drawCaptionBar,
  drawIntroCard,
  drawKenBurnsImage,
  drawOutroCard,
  drawZoomedFrame,
  seekVideo,
  wordCaptions,
  zoomAtTime,
  type EditSegment,
  type KenBurnsClip,
} from "./director";
import { loadImages } from "./screenshot-loader";
import { clipDurationSec, type SocialClipPlan } from "./social-clips";
import type { BrandKit, ClickEvent } from "./types";

const FPS = 30;
const HOOK_SEC = 1.5;
const OUTRO_SEC = 2;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function createAmbientPad(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, t / 1.5) * Math.min(1, (durationSec - t) / 1.5);
      data[i] = env * 0.06 * Math.sin(2 * Math.PI * 80 * t);
    }
  }
  return buffer;
}

function segmentForMoment(
  moment: SocialClipPlan["moment"],
  clicks: ClickEvent[],
  outputStart: number,
  outputDur: number,
): EditSegment {
  const sourceStart = moment.startSec ?? 0;
  const sourceEnd = Math.min(
    sourceStart + outputDur,
    moment.endSec ?? sourceStart + outputDur,
  );
  const segClicks = clicks.filter(
    (c) => c.tMs >= sourceStart * 1000 && c.tMs <= sourceEnd * 1000,
  );
  const localClicks = segClicks.map((c) => ({ ...c, tMs: c.tMs - sourceStart * 1000 }));

  return {
    momentId: moment.id,
    sourceStartSec: sourceStart,
    sourceEndSec: sourceEnd,
    outputStartSec: outputStart,
    outputDurationSec: outputDur,
    captionLine: { text: moment.title, startSec: outputStart, endSec: outputStart + outputDur },
    zoomKeyframes: buildZoomKeyframes(localClicks, outputDur),
  };
}

async function loadMusic(ctx: AudioContext, durationSec: number): Promise<AudioBuffer> {
  try {
    const res = await fetch("/music/bed.mp3");
    if (res.ok) {
      const ab = await res.arrayBuffer();
      return await ctx.decodeAudioData(ab);
    }
  } catch {
    /* fallback */
  }
  return createAmbientPad(ctx, durationSec);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface RenderSocialClipOpts {
  video: HTMLVideoElement;
  plan: SocialClipPlan;
  ctaText: string;
  clicks?: ClickEvent[];
  brand?: BrandKit;
  watermark?: boolean;
  images?: HTMLImageElement[];
}

function imageIndexForMoment(moment: SocialClipPlan["moment"], imageCount: number): number {
  const match = moment.id.match(/^ss-(\d+)$/);
  if (match) return Math.min(parseInt(match[1], 10), imageCount - 1);
  const start = moment.startSec ?? 0;
  return Math.min(Math.floor(start / 5), Math.max(0, imageCount - 1));
}

function kenBurnsClipForBody(bodyDur: number, index: number): KenBurnsClip {
  return {
    imageUrl: "",
    durationSec: bodyDur,
    startScale: 1,
    endScale: 1.08 + (index % 3) * 0.04,
    startX: 0.5 + (index % 2 === 0 ? -0.03 : 0.03),
    startY: 0.5,
    endX: 0.5,
    endY: 0.48,
  };
}

export async function renderSocialClip(opts: RenderSocialClipOpts): Promise<Blob> {
  const brand = opts.brand ?? getBrandKit();
  const clicks = opts.clicks ?? [];
  const bodyDur = clipDurationSec(opts.plan.moment);
  const totalSec = HOOK_SEC + bodyDur + OUTRO_SEC;
  const { w, h } = aspectDimensions("9:16", 1080);

  const segment = segmentForMoment(opts.plan.moment, clicks, HOOK_SEC, bodyDur);
  const captions = wordCaptions([
    { text: opts.plan.moment.title, startSec: HOOK_SEC, endSec: HOOK_SEC + bodyDur },
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const music = await loadMusic(audioCtx, totalSec);
  const mixBuffer = audioCtx.createBuffer(
    2,
    Math.ceil(totalSec * audioCtx.sampleRate),
    audioCtx.sampleRate,
  );
  for (let ch = 0; ch < 2; ch++) {
    const src = music.getChannelData(ch);
    const dst = mixBuffer.getChannelData(ch);
    for (let i = 0; i < src.length && i < dst.length; i++) dst[i] = src[i] * 0.14;
  }
  const mixSource = audioCtx.createBufferSource();
  mixSource.buffer = mixBuffer;
  mixSource.connect(dest);

  const stream = canvas.captureStream(FPS);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined,
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
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

    if (tSec < HOOK_SEC) {
      drawIntroCard(ctx, opts.plan.hookText, w, h, brand.primaryColor, brand.backgroundColor);
    } else if (tSec >= totalSec - OUTRO_SEC) {
      drawOutroCard(
        ctx,
        opts.ctaText,
        w,
        h,
        brand.primaryColor,
        brand.backgroundColor,
        opts.watermark ?? true,
      );
    } else {
      const progress = (tSec - HOOK_SEC) / bodyDur;
      ctx.fillStyle = brand.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      if (opts.images?.length) {
        const imgIdx = imageIndexForMoment(opts.plan.moment, opts.images.length);
        const img = opts.images[imgIdx];
        if (img) {
          const clip = kenBurnsClipForBody(bodyDur, imgIdx);
          drawKenBurnsImage(ctx, img, clip, progress, w, h, brand.backgroundColor);
        } else {
          const srcDur = segment.sourceEndSec - segment.sourceStartSec;
          const sourceTime = segment.sourceStartSec + progress * srcDur;
          if (Math.abs(sourceTime - lastSourceTime) > 0.03) {
            await seekVideo(opts.video, sourceTime);
            lastSourceTime = sourceTime;
          }
          const zoom = zoomAtTime(segment.zoomKeyframes, progress * bodyDur * 1000);
          drawZoomedFrame(ctx, opts.video, zoom, w, h);
        }
      } else {
        const srcDur = segment.sourceEndSec - segment.sourceStartSec;
        const sourceTime = segment.sourceStartSec + progress * srcDur;

        if (Math.abs(sourceTime - lastSourceTime) > 0.03) {
          await seekVideo(opts.video, sourceTime);
          lastSourceTime = sourceTime;
        }

        const zoom = zoomAtTime(segment.zoomKeyframes, progress * bodyDur * 1000);
        drawZoomedFrame(ctx, opts.video, zoom, w, h);
      }
      drawCaptionBar(ctx, captionsAtTime(captions, tSec), w, h, brand.accentColor);
    }

    await sleep(1000 / FPS);
  }

  recorder.stop();
  mixSource.stop();
  await audioCtx.close();
  return done;
}

export async function renderAllSocialClips(opts: {
  footageUrl: string;
  plans: SocialClipPlan[];
  ctaText: string;
  clicks?: ClickEvent[];
  brand?: BrandKit;
  watermark?: boolean;
  imageUrls?: string[];
  onProgress?: (pct: number) => void;
}): Promise<{ plan: SocialClipPlan; blob: Blob }[]> {
  const video = document.createElement("video");
  video.src = opts.footageUrl;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Footage load failed"));
  });

  const images = opts.imageUrls?.length ? await loadImages(opts.imageUrls) : undefined;

  const out: { plan: SocialClipPlan; blob: Blob }[] = [];
  for (let i = 0; i < opts.plans.length; i++) {
    const blob = await renderSocialClip({
      video,
      plan: opts.plans[i],
      ctaText: opts.ctaText,
      clicks: opts.clicks,
      brand: opts.brand,
      watermark: opts.watermark,
      images,
    });
    out.push({ plan: opts.plans[i], blob });
    opts.onProgress?.(Math.round(((i + 1) / opts.plans.length) * 100));
  }
  return out;
}

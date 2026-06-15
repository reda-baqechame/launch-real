import type { ClickEvent, DemoMoment, ShotListItem, VideoScript } from "./types";

/** One cut in the output timeline mapped back to source footage. */
export interface EditSegment {
  momentId: string;
  sourceStartSec: number;
  sourceEndSec: number;
  outputStartSec: number;
  outputDurationSec: number;
  zoomTarget?: { x: number; y: number; scale: number };
  captionLine?: { text: string; startSec: number; endSec: number };
  zoomKeyframes: ZoomKeyframe[];
}

export interface ZoomKeyframe {
  tMs: number;
  x: number;
  y: number;
  scale: number;
}

export interface WordCaption {
  text: string;
  startSec: number;
  endSec: number;
}

export interface KenBurnsClip {
  imageUrl: string;
  durationSec: number;
  startScale: number;
  endScale: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const ZOOM_SCALE = 1.45;
const ZOOM_MS = 900;
const EASE_MS = 400;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Build zoom keyframes from click events; Ken-Burns fallback when none. */
export function buildZoomKeyframes(
  clicks: ClickEvent[],
  durationSec: number,
): ZoomKeyframe[] {
  const durationMs = durationSec * 1000;
  if (clicks.length === 0) {
    return buildKenBurnsFallback(durationMs);
  }

  const keyframes: ZoomKeyframe[] = [{ tMs: 0, x: 0.5, y: 0.5, scale: 1 }];
  const sorted = [...clicks].sort((a, b) => a.tMs - b.tMs);

  for (const click of sorted) {
    const t = Math.min(click.tMs, durationMs - 100);
    const zoomIn = { tMs: t, x: click.x, y: click.y, scale: ZOOM_SCALE };
    const hold = { tMs: t + ZOOM_MS, x: click.x, y: click.y, scale: ZOOM_SCALE };
    const zoomOut = { tMs: t + ZOOM_MS + EASE_MS, x: 0.5, y: 0.5, scale: 1 };
    keyframes.push(zoomIn, hold, zoomOut);
  }

  keyframes.push({ tMs: durationMs, x: 0.5, y: 0.5, scale: 1 });
  return dedupeKeyframes(keyframes);
}

function buildKenBurnsFallback(durationMs: number): ZoomKeyframe[] {
  const mid = durationMs / 2;
  return [
    { tMs: 0, x: 0.5, y: 0.5, scale: 1 },
    { tMs: mid, x: 0.45, y: 0.45, scale: 1.12 },
    { tMs: durationMs, x: 0.55, y: 0.55, scale: 1.08 },
  ];
}

function dedupeKeyframes(kfs: ZoomKeyframe[]): ZoomKeyframe[] {
  return kfs
    .sort((a, b) => a.tMs - b.tMs)
    .filter((k, i, arr) => i === 0 || k.tMs > arr[i - 1].tMs);
}

/** Interpolate zoom at a given time in ms. */
export function zoomAtTime(keyframes: ZoomKeyframe[], tMs: number): { x: number; y: number; scale: number } {
  if (keyframes.length === 0) return { x: 0.5, y: 0.5, scale: 1 };
  if (tMs <= keyframes[0].tMs) {
    return { x: keyframes[0].x, y: keyframes[0].y, scale: keyframes[0].scale };
  }
  const last = keyframes[keyframes.length - 1];
  if (tMs >= last.tMs) return { x: last.x, y: last.y, scale: last.scale };

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (tMs >= a.tMs && tMs <= b.tMs) {
      const t = easeInOut((tMs - a.tMs) / (b.tMs - a.tMs));
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        scale: lerp(a.scale, b.scale, t),
      };
    }
  }
  return { x: 0.5, y: 0.5, scale: 1 };
}

/** Split VO lines into word-timed caption tokens. */
export function wordCaptions(lines: VideoScript["lines"]): WordCaption[] {
  const out: WordCaption[] = [];
  for (const line of lines) {
    const words = line.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const dur = line.endSec - line.startSec;
    const wordDur = dur / words.length;
    words.forEach((word, i) => {
      out.push({
        text: word,
        startSec: line.startSec + i * wordDur,
        endSec: line.startSec + (i + 1) * wordDur,
      });
    });
  }
  return out;
}

/** Active caption words at time t (show current + previous for context). */
export function captionsAtTime(captions: WordCaption[], tSec: number): string {
  const active = captions.filter((c) => tSec >= c.startSec && tSec < c.endSec);
  if (active.length > 0) return active.map((c) => c.text).join(" ");
  const recent = captions.filter((c) => c.endSec <= tSec).slice(-3);
  return recent.map((c) => c.text).join(" ");
}

/** Sample frames from a video element as JPEG data URLs for analysis. */
export async function sampleFrames(video: HTMLVideoElement, count = 10): Promise<string[]> {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return [];

  const canvas = document.createElement("canvas");
  canvas.width = Math.min(640, video.videoWidth || 640);
  canvas.height = Math.min(360, video.videoHeight || 360);
  const ctx = canvas.getContext("2d")!;
  const frames: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = (duration * (i + 0.5)) / count;
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/jpeg", 0.75));
  }
  return frames;
}

/** Wait until a video element has seeked to the requested time. */
export function seekVideo(video: HTMLVideoElement, tSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - tSec) < 0.04 && video.readyState >= 2) {
      resolve();
      return;
    }
    const onSeek = () => {
      video.removeEventListener("seeked", onSeek);
      resolve();
    };
    video.addEventListener("seeked", onSeek);
    video.currentTime = Math.max(0, tSec);
    setTimeout(() => {
      video.removeEventListener("seeked", onSeek);
      resolve();
    }, 250);
  });
}

/**
 * Build a shot-based edit timeline: output = intro + N moment cuts + outro.
 * Maps script lines and click zooms per segment.
 */
export function buildEditTimeline(
  moments: DemoMoment[],
  script: VideoScript,
  clicks: ClickEvent[],
  introSec: number,
  shotList?: ShotListItem[],
  footageDurSec = 60,
): EditSegment[] {
  const momentMap = new Map(moments.map((m) => [m.id, m]));
  const kept = moments.filter((m) => m.keepByDefault);

  const shots: ShotListItem[] =
    shotList?.length ?
      shotList
    : kept.map((m) => ({
        momentId: m.id,
        durationSec: Math.max(
          2.5,
          Math.min(6, (m.endSec ?? (m.startSec ?? 0) + 4) - (m.startSec ?? 0)),
        ),
      }));

  if (shots.length === 0 && footageDurSec > 0) {
    const dur = Math.min(30, footageDurSec);
    return [
      {
        momentId: "full",
        sourceStartSec: 0,
        sourceEndSec: dur,
        outputStartSec: introSec,
        outputDurationSec: dur,
        zoomKeyframes: buildZoomKeyframes(clicks, dur),
      },
    ];
  }

  if (shots.length === 0) {
    return [];
  }

  let outputCursor = introSec;
  const segments: EditSegment[] = [];

  shots.forEach((shot, i) => {
    const moment = momentMap.get(shot.momentId) ?? kept[i];
    if (!moment) return;

    const slot = footageDurSec / Math.max(1, shots.length);
    const sourceStart =
      moment.startSec ?? Math.min(i * slot, Math.max(0, footageDurSec - 2));
    const naturalDur = (moment.endSec ?? sourceStart + 4) - sourceStart;
    const outputDur = shot.durationSec || Math.max(2.5, Math.min(6, naturalDur));
    const sourceEnd = Math.min(
      sourceStart + outputDur,
      moment.endSec ?? sourceStart + outputDur,
    );

    const line = script.lines[i];
    const captionLine = line ?
      {
        text: line.text,
        startSec: outputCursor,
        endSec: outputCursor + outputDur,
      }
    : undefined;

    const segClicks = clicks.filter(
      (c) => c.tMs >= sourceStart * 1000 && c.tMs <= sourceEnd * 1000,
    );
    const localClicks = segClicks.map((c) => ({
      ...c,
      tMs: c.tMs - sourceStart * 1000,
    }));

    let zoomKeyframes: ZoomKeyframe[];
    if (shot.zoomTarget) {
      const mid = (outputDur * 1000) / 2;
      zoomKeyframes = [
        { tMs: 0, x: 0.5, y: 0.5, scale: 1 },
        { tMs: 200, x: shot.zoomTarget.x, y: shot.zoomTarget.y, scale: shot.zoomTarget.scale ?? ZOOM_SCALE },
        { tMs: mid, x: shot.zoomTarget.x, y: shot.zoomTarget.y, scale: shot.zoomTarget.scale ?? ZOOM_SCALE },
        { tMs: outputDur * 1000, x: 0.5, y: 0.5, scale: 1 },
      ];
    } else {
      zoomKeyframes = buildZoomKeyframes(localClicks, outputDur);
    }

    segments.push({
      momentId: shot.momentId,
      sourceStartSec: sourceStart,
      sourceEndSec: sourceEnd,
      outputStartSec: outputCursor,
      outputDurationSec: outputDur,
      zoomTarget: shot.zoomTarget,
      captionLine,
      zoomKeyframes,
    });

    outputCursor += outputDur;
  });

  return segments;
}

export function outputDurationFromTimeline(
  segments: EditSegment[],
  introSec: number,
  outroSec: number,
): number {
  if (segments.length === 0) return introSec + outroSec + 8;
  const last = segments[segments.length - 1];
  return last.outputStartSec + last.outputDurationSec + outroSec;
}

/** Map output timeline position to active segment + progress 0–1. */
export function segmentAtOutputTime(
  segments: EditSegment[],
  tSec: number,
): { segment: EditSegment; progress: number } | null {
  for (const seg of segments) {
    if (tSec >= seg.outputStartSec && tSec < seg.outputStartSec + seg.outputDurationSec) {
      const progress =
        (tSec - seg.outputStartSec) / Math.max(0.001, seg.outputDurationSec);
      return { segment: seg, progress };
    }
  }
  return null;
}

export function captionLinesFromTimeline(segments: EditSegment[]): VideoScript["lines"] {
  return segments
    .filter((s) => s.captionLine)
    .map((s) => s.captionLine!);
}

/** Grab a single frame at timestamp as data URL. */
export async function grabFrame(video: HTMLVideoElement, tSec: number): Promise<string> {
  await seekVideo(video, tSec);
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(640, video.videoWidth || 640);
  canvas.height = Math.min(360, video.videoHeight || 360);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Draw Ken-Burns frame from a still image. */
export function drawKenBurnsImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  clip: KenBurnsClip,
  progress: number,
  w: number,
  h: number,
  bg = "#0a0a0a",
) {
  const t = easeInOut(Math.max(0, Math.min(1, progress)));
  const scale = lerp(clip.startScale, clip.endScale, t);
  const cx = lerp(clip.startX, clip.endX, t);
  const cy = lerp(clip.startY, clip.endY, t);
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;
  const cover = Math.max(w / iw, h / ih) * scale;
  const sw = w / cover;
  const sh = h / cover;
  const sx = Math.max(0, Math.min(iw - sw, cx * iw - sw / 2));
  const sy = Math.max(0, Math.min(ih - sh, cy * ih - sh / 2));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

/** Ken-Burns params per screenshot image. */
export function buildScreenshotClips(
  imageUrls: string[],
  durationEach = 3.5,
): KenBurnsClip[] {
  return imageUrls.map((imageUrl, i) => ({
    imageUrl,
    durationSec: durationEach,
    startScale: 1,
    endScale: 1.08 + (i % 3) * 0.04,
    startX: 0.5 + (i % 2 === 0 ? -0.03 : 0.03),
    startY: 0.5,
    endX: 0.5 + (i % 2 === 0 ? 0.03 : -0.03),
    endY: 0.5,
  }));
}

export function formatTimecode(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export type AspectRatio = "16:9" | "9:16" | "1:1";

export function aspectDimensions(aspect: AspectRatio, base = 1080): { w: number; h: number } {
  switch (aspect) {
    case "9:16":
      return { w: base * (9 / 16), h: base };
    case "1:1":
      return { w: base, h: base };
    default:
      return { w: base, h: base * (9 / 16) };
  }
}

/** Draw source video frame with zoom transform onto destination canvas. */
export function drawZoomedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  zoom: { x: number; y: number; scale: number },
  destW: number,
  destH: number,
) {
  const vw = video.videoWidth || destW;
  const vh = video.videoHeight || destH;
  const scale = zoom.scale;
  const sw = vw / scale;
  const sh = vh / scale;
  const sx = Math.max(0, Math.min(vw - sw, zoom.x * vw - sw / 2));
  const sy = Math.max(0, Math.min(vh - sh, zoom.y * vh - sh / 2));
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);
}

export function drawCaptionBar(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  primaryColor: string,
) {
  if (!text.trim()) return;
  const pad = Math.round(h * 0.04);
  const fontSize = Math.round(h * 0.045);
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text, w - pad * 4);
  const lineH = fontSize * 1.35;
  const boxH = lines.length * lineH + pad * 2;
  const boxY = h - boxH - pad * 2;

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, pad * 2, boxY, w - pad * 4, boxH, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, boxY + pad + lineH * (i + 0.5), w - pad * 4);
  });

  ctx.fillStyle = primaryColor;
  ctx.fillRect(pad * 2, boxY, 4, boxH);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawIntroCard(
  ctx: CanvasRenderingContext2D,
  hook: string,
  w: number,
  h: number,
  primary: string,
  bg: string,
) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, w, 6);
  const fontSize = Math.round(h * 0.07);
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, hook, w * 0.8);
  const lineH = fontSize * 1.3;
  const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineH));
}

export function drawOutroCard(
  ctx: CanvasRenderingContext2D,
  cta: string,
  w: number,
  h: number,
  primary: string,
  bg: string,
  watermark: boolean,
) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = primary;
  ctx.fillRect(0, h - 6, w, 6);
  const fontSize = Math.round(h * 0.055);
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cta, w / 2, h / 2 - (watermark ? 20 : 0));
  if (watermark) {
    ctx.font = `400 ${Math.round(h * 0.028)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Made with LaunchReel", w / 2, h / 2 + fontSize);
  }
}

"use client";

import type { BrandKit, Slide } from "./types";
import { ensureBrandFont, fontStack } from "./director";

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
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
  return lines;
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  slide: Slide,
  w: number,
  h: number,
  brand: BrandKit,
  font: string,
  alpha: number,
) {
  ctx.globalAlpha = 1;
  // Background
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, brand.backgroundColor || "#0a0a0b");
  g.addColorStop(1, brand.primaryColor || "#1a1030");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = brand.accentColor || "#8a78f9";
  ctx.fillRect(0, 0, w, Math.round(h * 0.012));

  ctx.globalAlpha = alpha;
  const padX = Math.round(w * 0.1);
  const centered = slide.kind !== "point";
  ctx.textAlign = centered ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  const x = centered ? w / 2 : padX;

  // Title
  const titleSize = Math.round(h * (slide.kind === "title" ? 0.11 : 0.08));
  ctx.font = `700 ${titleSize}px ${font}`;
  ctx.fillStyle = "#ffffff";
  const titleLines = wrap(ctx, slide.title, w - padX * 2);
  let y = slide.kind === "point" ? Math.round(h * 0.26) : h / 2 - titleLines.length * titleSize * 0.2;
  titleLines.forEach((l) => {
    ctx.fillText(l, x, y);
    y += titleSize * 1.15;
  });

  // Bullets
  const bSize = Math.round(h * 0.04);
  ctx.font = `400 ${bSize}px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  y += bSize * 0.8;
  if (centered) {
    slide.bullets.forEach((b) => {
      wrap(ctx, b, w - padX * 2).forEach((l) => {
        ctx.fillText(l, x, y);
        y += bSize * 1.5;
      });
    });
  } else {
    slide.bullets.forEach((b) => {
      const lines = wrap(ctx, b, w - padX * 2 - Math.round(w * 0.03));
      ctx.fillStyle = brand.accentColor || "#8a78f9";
      ctx.fillText("•", x, y);
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      lines.forEach((l, li) => {
        ctx.fillText(l, x + Math.round(w * 0.03), y);
        if (li < lines.length - 1) y += bSize * 1.4;
      });
      y += bSize * 1.7;
    });
  }
  ctx.globalAlpha = 1;
}

/** Render a slide deck to a video blob (each slide held with a crossfade). */
export async function deckToVideo(
  slides: Slide[],
  brand: BrandKit,
  opts: { perSlideSec?: number; proxy?: boolean } = {},
): Promise<Blob> {
  const base = opts.proxy ? 720 : 1080;
  const w = Math.round(base * (16 / 9));
  const h = base;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas unavailable.");
  const ctx: CanvasRenderingContext2D = ctx2d;
  const font = await ensureBrandFont(brand.font).catch(() => fontStack(brand.font));

  const stream = canvas.captureStream(30);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime ?? "video/webm" }));
  });

  const perSlide = (opts.perSlideSec ?? 4) * 1000;
  const fade = 350;
  rec.start();
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function frame() {
      const elapsed = performance.now() - start;
      const idx = Math.min(slides.length - 1, Math.floor(elapsed / perSlide));
      const into = elapsed - idx * perSlide;
      const alpha = Math.min(1, into / fade) * Math.min(1, (perSlide - into) / fade + 0.001);
      drawSlide(ctx, slides[idx], w, h, brand, font, Math.max(0.05, Math.min(1, alpha)));
      if (elapsed >= perSlide * slides.length) {
        rec.stop();
        resolve();
      } else {
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
  });

  return done;
}

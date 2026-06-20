"use client";

import type { BrandKit } from "./types";
import { ensureBrandFont } from "./director";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Render a branded 16:9 thumbnail (title card) to a PNG blob. */
export async function makeThumbnail(brand: BrandKit, title: string, subtitle?: string): Promise<Blob> {
  const w = 1280;
  const h = 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const font = await ensureBrandFont(brand.font).catch(() => "system-ui, sans-serif");

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, brand.backgroundColor || "#0a0a0b");
  g.addColorStop(1, brand.primaryColor || "#1a1030");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = brand.accentColor || "#8a78f9";
  ctx.fillRect(0, 0, 10, h);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 84px ${font}`;
  let y = 240;
  for (const line of wrap(ctx, title, w - 200)) {
    ctx.fillText(line, 90, y);
    y += 100;
  }
  if (subtitle) {
    ctx.font = `400 40px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(subtitle.slice(0, 70), 90, y + 20);
  }
  ctx.font = `600 34px ${font}`;
  ctx.fillStyle = brand.accentColor || "#8a78f9";
  ctx.fillText(brand.logoText || "LaunchReel", 90, h - 70);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Thumbnail failed."))), "image/png");
  });
}

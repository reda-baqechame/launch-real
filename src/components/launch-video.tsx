"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { BrandKit, Project } from "@/lib/types";

const FORMATS = {
  "16:9": { w: 1280, h: 720, label: "16:9 · YouTube / PH" },
  "9:16": { w: 720, h: 1280, label: "9:16 · Reels / TikTok" },
  "1:1": { w: 1080, h: 1080, label: "1:1 · LinkedIn / X" },
} as const;
type Format = keyof typeof FORMATS;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find(
    (t) => MediaRecorder.isTypeSupported(t),
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function inkFor(bg: string): string {
  const m = /^#?([\da-f]{6})$/i.exec(bg.trim());
  if (!m) return "#EDEDEF";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#0A0A0B" : "#EDEDEF";
}

interface Layout {
  W: number;
  H: number;
  u: number;
  cx: number;
  cy: number;
  maxW: number;
}

interface Scene {
  ms: number;
  eyebrow?: string;
  draw: (ctx: CanvasRenderingContext2D, p: number, a: number, L: Layout) => void;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function lines(ctx: CanvasRenderingContext2D, ls: string[], cx: number, cy: number, lh: number) {
  let y = cy - ((ls.length - 1) * lh) / 2;
  for (const l of ls) {
    ctx.fillText(l, cx, y);
    y += lh;
  }
}

export function LaunchVideoStudio({ project, brand }: { project: Project; brand: BrandKit }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const [format, setFormat] = useState<Format>("16:9");
  const [phase, setPhase] = useState<"idle" | "playing" | "recording">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [ext, setExt] = useState("webm");

  const { w: W, h: H } = FORMATS[format];
  const bg = brand.backgroundColor || "#0A0A0B";
  const accent = brand.accentColor || "#6E56F7";
  const ink = inkFor(bg);
  const sub = ink === "#EDEDEF" ? "#9A9AA5" : "#55555E";

  const scenes: Scene[] = useMemo(() => {
    const angle = project.angles.find((a) => a.id === project.selectedAngleId);
    const rise = (p: number, u: number) => (1 - easeOut(Math.min(1, p / 0.2))) * u * 0.55;

    return [
      {
        ms: 2200,
        eyebrow: "LaunchReel presents",
        draw: (ctx, p, a, L) => {
          ctx.globalAlpha = a;
          const d = L.u * 1.8;
          const x = L.cx - d / 2;
          const y = L.cy - d / 2 - L.u * 0.5 + rise(p, L.u);
          roundRect(ctx, x, y, d, d, d * 0.24);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(x + d * 0.38, y + d * 0.3);
          ctx.lineTo(x + d * 0.38, y + d * 0.7);
          ctx.lineTo(x + d * 0.72, y + d / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = ink;
          ctx.font = `600 ${L.u * 0.9}px sans-serif`;
          ctx.fillText(brand.logoText || project.name, L.cx, y + d + L.u * 0.95);
        },
      },
      {
        ms: 3000,
        eyebrow: angle ? angle.kind.toUpperCase() : "THE HOOK",
        draw: (ctx, p, a, L) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = ink;
          const fs = L.u * 1.25;
          ctx.font = `700 ${fs}px sans-serif`;
          lines(ctx, wrap(ctx, project.mainHook, L.maxW), L.cx, L.cy + rise(p, L.u), fs * 1.2);
        },
      },
      {
        ms: 2800,
        eyebrow: "WHAT IT IS",
        draw: (ctx, p, a, L) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = ink;
          const fs = L.u * 0.82;
          ctx.font = `500 ${fs}px sans-serif`;
          lines(ctx, wrap(ctx, project.oneLiner, L.maxW), L.cx, L.cy - L.u * 0.3 + rise(p, L.u), fs * 1.35);
          ctx.fillStyle = sub;
          ctx.font = `400 ${L.u * 0.5}px sans-serif`;
          ctx.fillText(`For ${project.audience}`, L.cx, L.cy + L.u * 2);
        },
      },
      {
        ms: 2600,
        eyebrow: "LAUNCH SCORE",
        draw: (ctx, p, a, L) => {
          ctx.globalAlpha = a;
          const r = L.u * 2;
          const prog = easeOut(Math.min(1, p / 0.6));
          ctx.lineWidth = r * 0.13;
          ctx.strokeStyle = ink === "#EDEDEF" ? "#1f1f25" : "#d9d9de";
          ctx.beginPath();
          ctx.arc(L.cx, L.cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = accent;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(L.cx, L.cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (project.score / 100) * prog);
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = `700 ${L.u * 1.45}px sans-serif`;
          ctx.fillText(String(Math.round(project.score * prog)), L.cx, L.cy - L.u * 0.1);
          ctx.fillStyle = sub;
          ctx.font = `400 ${L.u * 0.46}px sans-serif`;
          ctx.fillText("/ 100", L.cx, L.cy + L.u * 0.95);
        },
      },
      {
        ms: 2600,
        eyebrow: "GET STARTED",
        draw: (ctx, p, a, L) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = accent;
          const fs = L.u;
          ctx.font = `700 ${fs}px sans-serif`;
          lines(ctx, wrap(ctx, brand.cta, L.maxW), L.cx, L.cy - L.u * 0.3 + rise(p, L.u), fs * 1.25);
          ctx.fillStyle = sub;
          ctx.font = `400 ${L.u * 0.46}px sans-serif`;
          ctx.fillText(brand.endCard || "Made with LaunchReel", L.cx, L.cy + L.u * 2.2);
        },
      },
    ];
  }, [project, brand, accent, ink, sub]);

  const total = useMemo(() => scenes.reduce((s, x) => s + x.ms, 0), [scenes]);

  const renderFrame = useCallback(
    (elapsed: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const u = Math.min(W, H) / 12;
      const L: Layout = { W, H, u, cx: W / 2, cy: H / 2, maxW: W * 0.84 };

      ctx.globalAlpha = 1;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      let acc = 0;
      let scene = scenes[scenes.length - 1];
      let local = scene.ms;
      for (const s of scenes) {
        if (elapsed < acc + s.ms) {
          scene = s;
          local = elapsed - acc;
          break;
        }
        acc += s.ms;
      }
      const p = Math.min(1, local / scene.ms);
      const alpha = Math.min(Math.min(1, p / 0.15), Math.min(1, (1 - p) / 0.12));

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (scene.eyebrow) {
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = accent;
        ctx.font = `600 ${u * 0.34}px sans-serif`;
        ctx.fillText(spaced(scene.eyebrow), L.cx, H * 0.13);
      }
      scene.draw(ctx, p, alpha, L);
      ctx.globalAlpha = 1;
    },
    [scenes, bg, accent, W, H],
  );

  useEffect(() => {
    if (!runningRef.current) renderFrame(0);
  }, [renderFrame]);

  const runTimeline = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          renderFrame(Math.min(elapsed, total));
          if (elapsed >= total) {
            resolve();
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }),
    [renderFrame, total],
  );

  const preview = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("playing");
    await runTimeline();
    renderFrame(0);
    runningRef.current = false;
    setPhase("idle");
  }, [runTimeline, renderFrame]);

  const generate = useCallback(async () => {
    if (runningRef.current || typeof MediaRecorder === "undefined") return;
    runningRef.current = true;
    setPhase("recording");
    if (url) URL.revokeObjectURL(url);
    setUrl(null);

    const stream = canvasRef.current!.captureStream(30);
    const mime = pickMime();
    setExt(mime?.includes("mp4") ? "mp4" : "webm");
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime ?? "video/webm" });
      setUrl(URL.createObjectURL(blob));
      renderFrame(0);
      runningRef.current = false;
      setPhase("idle");
    };
    recorderRef.current = recorder;
    recorder.start();
    await runTimeline();
    recorder.stop();
  }, [runTimeline, renderFrame, url]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const busy = phase !== "idle";
  const frameStyle = {
    aspectRatio: `${W} / ${H}`,
    maxHeight: "64vh",
    width: format === "16:9" ? "100%" : "auto",
    maxWidth: "100%",
  } as const;

  return (
    <div>
      {/* Format selector */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(FORMATS) as Format[]).map((f) => (
          <button
            key={f}
            disabled={busy}
            onClick={() => {
              setUrl(null);
              setFormat(f);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50",
              f === format
                ? "border-accent/50 bg-accent/10 text-ink"
                : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            {FORMATS[f].label}
          </button>
        ))}
      </div>

      <div className="flex justify-center overflow-hidden rounded-xl border border-line bg-black">
        {url ? (
          <video src={url} controls className="block" style={frameStyle} />
        ) : (
          <canvas ref={canvasRef} width={W} height={H} className="block" style={frameStyle} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {url ? (
          <>
            <a
              href={url}
              download={`${project.name.toLowerCase()}-launch-${format.replace(":", "x")}.${ext}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-soft"
            >
              Download {format}
            </a>
            <Button variant="secondary" size="md" onClick={() => setUrl(null)}>
              Back to editor
            </Button>
            <Button variant="secondary" size="md" disabled={busy} onClick={generate}>
              Regenerate
            </Button>
          </>
        ) : (
          <>
            <Button onClick={generate} disabled={busy}>
              {phase === "recording" ? "Rendering…" : "Generate launch video"}
            </Button>
            <Button variant="secondary" size="md" onClick={preview} disabled={busy}>
              {phase === "playing" ? "Playing…" : "Play preview"}
            </Button>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-mute">
        Rendered in your browser from your launch kit and brand kit — about{" "}
        {Math.round(total / 1000)}s, {format}. No upload, no key.
      </p>
    </div>
  );
}

function spaced(s: string): string {
  return s.split("").join(" ");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { BrandKit, Project } from "@/lib/types";

const W = 1280;
const H = 720;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ].find((t) => MediaRecorder.isTypeSupported(t));
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Pick a readable text color for an arbitrary background hex. */
function inkFor(bg: string): string {
  const m = /^#?([\da-f]{6})$/i.exec(bg.trim());
  if (!m) return "#EDEDEF";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0B" : "#EDEDEF";
}

interface Scene {
  ms: number;
  eyebrow?: string;
  draw: (ctx: CanvasRenderingContext2D, p: number, alpha: number) => void;
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

function centeredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cy: number,
  lineHeight: number,
) {
  let y = cy - ((lines.length - 1) * lineHeight) / 2;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += lineHeight;
  }
}

export function LaunchVideoStudio({ project, brand }: { project: Project; brand: BrandKit }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const [phase, setPhase] = useState<"idle" | "playing" | "recording">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [ext, setExt] = useState("webm");

  const bg = brand.backgroundColor || "#0A0A0B";
  const accent = brand.accentColor || "#6E56F7";
  const ink = inkFor(bg);
  const sub = ink === "#EDEDEF" ? "#9A9AA5" : "#55555E";

  const scenes: Scene[] = useMemo(() => {
    const angle = project.angles.find((a) => a.id === project.selectedAngleId);
    const rise = (p: number) => (1 - easeOut(Math.min(1, p / 0.2))) * 36;

    return [
      {
        ms: 2200,
        eyebrow: "LaunchReel presents",
        draw: (ctx, p, a) => {
          ctx.globalAlpha = a;
          const d = 110;
          const x = W / 2 - d / 2;
          const y = H / 2 - d / 2 - 30 + rise(p);
          roundRect(ctx, x, y, d, d, 26);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(x + 42, y + 34);
          ctx.lineTo(x + 42, y + d - 34);
          ctx.lineTo(x + d - 34, y + d / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = ink;
          ctx.font = "600 56px sans-serif";
          ctx.fillText(brand.logoText || project.name, W / 2, y + d + 64);
        },
      },
      {
        ms: 3000,
        eyebrow: angle ? angle.kind.toUpperCase() : "THE HOOK",
        draw: (ctx, p, a) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = ink;
          ctx.font = "700 76px sans-serif";
          centeredLines(ctx, wrap(ctx, project.mainHook, W - 280), H / 2 + rise(p), 92);
        },
      },
      {
        ms: 2800,
        eyebrow: "WHAT IT IS",
        draw: (ctx, p, a) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = ink;
          ctx.font = "500 50px sans-serif";
          centeredLines(ctx, wrap(ctx, project.oneLiner, W - 320), H / 2 - 10 + rise(p), 68);
          ctx.fillStyle = sub;
          ctx.font = "400 30px sans-serif";
          ctx.fillText(`For ${project.audience}`, W / 2, H / 2 + 130);
        },
      },
      {
        ms: 2600,
        eyebrow: "LAUNCH SCORE",
        draw: (ctx, p, a) => {
          ctx.globalAlpha = a;
          const cx = W / 2;
          const cy = H / 2 + 6;
          const r = 120;
          const prog = easeOut(Math.min(1, p / 0.6));
          ctx.lineWidth = 16;
          ctx.strokeStyle = ink === "#EDEDEF" ? "#1f1f25" : "#d9d9de";
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = accent;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (project.score / 100) * prog);
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = "700 88px sans-serif";
          ctx.fillText(String(Math.round(project.score * prog)), cx, cy - 6);
          ctx.fillStyle = sub;
          ctx.font = "400 28px sans-serif";
          ctx.fillText("/ 100", cx, cy + 58);
        },
      },
      {
        ms: 2600,
        eyebrow: "GET STARTED",
        draw: (ctx, p, a) => {
          ctx.globalAlpha = a;
          ctx.fillStyle = accent;
          ctx.font = "700 60px sans-serif";
          centeredLines(ctx, wrap(ctx, brand.cta, W - 320), H / 2 - 20 + rise(p), 76);
          ctx.fillStyle = sub;
          ctx.font = "400 28px sans-serif";
          ctx.fillText(brand.endCard || "Made with LaunchReel", W / 2, H / 2 + 150);
        },
      },
    ];
  }, [project, brand, accent, ink, sub]);

  const total = useMemo(() => scenes.reduce((s, x) => s + x.ms, 0), [scenes]);

  const renderFrame = useCallback(
    (elapsed: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      let acc = 0;
      let scene = scenes[scenes.length - 1];
      let local = scenes[scenes.length - 1].ms;
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
        ctx.font = "600 24px sans-serif";
        ctx.fillText(spaced(scene.eyebrow), W / 2, 96);
      }
      scene.draw(ctx, p, alpha);
      ctx.globalAlpha = 1;
    },
    [scenes, bg, accent],
  );

  // Draw the first frame on mount / when content changes.
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

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const busy = phase !== "idle";

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line">
        {url ? (
          <video src={url} controls className="aspect-video w-full bg-black" />
        ) : (
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="aspect-video w-full"
            style={{ background: bg }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {url ? (
          <>
            <a
              href={url}
              download={`${project.name.toLowerCase()}-launch.${ext}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-soft"
            >
              Download MP4
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
        {Math.round(total / 1000)}s, 16:9. No upload, no key.
      </p>
    </div>
  );
}

function spaced(s: string): string {
  return s.split("").join(" ");
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

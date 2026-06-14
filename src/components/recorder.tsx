"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Card, Pill } from "@/components/ui";
import { AssetAction } from "@/components/asset-bits";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

type Phase = "setup" | "countdown" | "recording" | "paused" | "review";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function Recorder() {
  const router = useRouter();
  const { createProject } = useStore();
  const [phase, setPhase] = useState<Phase>("setup");
  const [withCamera, setWithCamera] = useState(true);
  const [withMic, setWithMic] = useState(true);
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileExt, setFileExt] = useState("webm");
  const [notes, setNotes] = useState("");

  // Live preview targets
  const previewRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);

  // Recording machinery (kept in refs so they survive re-renders)
  const screenStream = useRef<MediaStream | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStreams = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    [screenStream, cameraStream, micStream].forEach((s) => {
      s.current?.getTracks().forEach((t) => t.stop());
      s.current = null;
    });
  }, []);

  useEffect(() => cleanupStreams, [cleanupStreams]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const beginCompositing = useCallback(() => {
    const screenVideo = document.createElement("video");
    screenVideo.srcObject = screenStream.current!;
    screenVideo.muted = true;
    void screenVideo.play();

    let camVideo: HTMLVideoElement | null = null;
    if (cameraStream.current) {
      camVideo = document.createElement("video");
      camVideo.srcObject = cameraStream.current;
      camVideo.muted = true;
      void camVideo.play();
    }

    const track = screenStream.current!.getVideoTracks()[0];
    const { width = 1280, height = 720 } = track.getSettings();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;

    // Live preview mirrors the canvas via the screen stream directly.
    if (previewRef.current) {
      previewRef.current.srcObject = screenStream.current;
      void previewRef.current.play();
    }

    const draw = () => {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      if (camVideo) {
        // Circular camera bubble, bottom-left.
        const d = Math.round(Math.min(canvas.width, canvas.height) * 0.22);
        const pad = Math.round(d * 0.18);
        const x = pad;
        const y = canvas.height - d - pad;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.strokeStyle = "#6e56f7";
        ctx.lineWidth = Math.max(3, d * 0.03);
        ctx.stroke();
        ctx.clip();
        const vw = camVideo.videoWidth || 1;
        const vh = camVideo.videoHeight || 1;
        const side = Math.min(vw, vh);
        ctx.drawImage(camVideo, (vw - side) / 2, (vh - side) / 2, side, side, x, y, d, d);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    // Build the recorded stream: composited canvas video + mic audio.
    const canvasStream = canvas.captureStream(30);
    if (micStream.current) {
      micStream.current.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
    }

    const mimeType = pickMimeType();
    setFileExt(mimeType?.includes("mp4") ? "mp4" : "webm");
    const recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: mimeType ?? "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setPhase("review");
      cleanupStreams();
    };
    recorderRef.current = recorder;
    recorder.start();

    // Stop if the user ends screen share from the browser chrome.
    track.addEventListener("ended", stop);

    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    setPhase("recording");
  }, [cleanupStreams, stop]);

  const start = useCallback(async () => {
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getDisplayMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "This browser can't record screens. Try the latest Chrome, Edge, or Firefox on desktop — recording needs a secure (HTTPS or localhost) context.",
      );
      return;
    }
    try {
      screenStream.current = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      if (withMic) {
        micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (withCamera) {
        cameraStream.current = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 640 },
        });
      }
    } catch {
      setError("Screen, camera, or microphone access was denied.");
      cleanupStreams();
      return;
    }

    // 3-2-1 countdown, then roll.
    setPhase("countdown");
    setCount(3);
    let c = 3;
    const t = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearInterval(t);
        beginCompositing();
      } else {
        setCount(c);
      }
    }, 800);
  }, [withCamera, withMic, beginCompositing, cleanupStreams]);

  const togglePause = useCallback(() => {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state === "recording") {
      r.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("paused");
    } else if (r.state === "paused") {
      r.resume();
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      setPhase("recording");
    }
  }, []);

  const reset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setElapsed(0);
    setPhase("setup");
  }, [videoUrl]);

  /* --------------------------------------------------------------- Review */
  if (phase === "review" && videoUrl) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="p-4">
          <video
            ref={reviewRef}
            src={videoUrl}
            controls
            className="aspect-video w-full rounded-xl border border-line bg-black"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill>Length {formatTime(elapsed)}</Pill>
            <Pill>{withCamera ? "Camera bubble" : "Screen only"}</Pill>
            <Pill>{withMic ? "Mic audio" : "Muted"}</Pill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={videoUrl}
              download={`launchreel-recording.${fileExt}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-soft"
            >
              Download recording
            </a>
            <AssetAction>Copy share link</AssetAction>
            <Button variant="secondary" size="md" onClick={reset}>
              Re-record
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-ink">Turn this recording into…</p>
          <p className="mt-1 text-xs text-ink-mute">
            Loom stops at a link. LaunchReel keeps going.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => {
                const p = createProject({ fromRecording: true });
                router.push(`/projects/${p.id}/audit`);
              }}
            >
              A full launch kit
            </Button>
            <ButtonLink href="/new" variant="secondary" className="w-full">
              A product presentation
            </ButtonLink>
            <ButtonLink href="/new" variant="secondary" className="w-full">
              A step-by-step tutorial
            </ButtonLink>
            <ButtonLink href="/new" variant="secondary" className="w-full">
              Help docs
            </ButtonLink>
          </div>
          <ul className="mt-5 space-y-1.5 text-xs text-ink-mute">
            <li>• Auto title, transcript & chapters (coming next)</li>
            <li>• Silence & filler-word removal</li>
            <li>• Viewer analytics on the share page</li>
          </ul>
        </Card>
      </div>
    );
  }

  /* --------------------------------------------------- Recording / preview */
  if (phase === "countdown" || phase === "recording" || phase === "paused") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="relative overflow-hidden p-2">
          <video
            ref={previewRef}
            muted
            playsInline
            className="aspect-video w-full rounded-xl border border-line bg-black"
          />
          {phase === "countdown" && (
            <div className="absolute inset-2 flex items-center justify-center rounded-xl bg-base/80 backdrop-blur">
              <span className="font-mono text-7xl font-semibold text-ink">{count}</span>
            </div>
          )}
          {phase !== "countdown" && (
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-base/80 px-3 py-1.5 backdrop-blur">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  phase === "recording" ? "bg-bad animate-pulse-soft" : "bg-warn",
                )}
              />
              <span className="font-mono text-sm text-ink">{formatTime(elapsed)}</span>
              {phase === "paused" && <span className="text-xs text-warn">Paused</span>}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink">Controls</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button onClick={togglePause} variant="secondary" disabled={phase === "countdown"}>
                {phase === "paused" ? "Resume" : "Pause"}
              </Button>
              <Button onClick={stop} disabled={phase === "countdown"}>
                Stop &amp; review
              </Button>
            </div>
          </Card>

          <Card className="flex-1 p-5">
            <p className="text-sm font-medium text-ink">Teleprompter</p>
            <p className="mt-1 text-xs text-ink-mute">
              Narrate while recording for a sharper script.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Today I'm showing how…"
              className="mt-3 h-40 w-full resize-none rounded-lg border border-line bg-base p-3 text-sm leading-relaxed text-ink-soft outline-none focus:border-accent/60"
            />
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- Setup */
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-ink">Before you record</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Toggle
          on={withCamera}
          onClick={() => setWithCamera((v) => !v)}
          label="Camera bubble"
          hint="A circular webcam overlay, baked into the recording."
        />
        <Toggle
          on={withMic}
          onClick={() => setWithMic((v) => !v)}
          label="Microphone"
          hint="Record your voice alongside the screen."
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <Button onClick={start} size="lg" className="mt-6">
        Start recording
      </Button>
      <p className="mt-3 text-xs text-ink-mute">
        You&apos;ll pick which screen, window, or tab to share next. Everything is
        captured and composited locally in your browser — nothing is uploaded.
      </p>
      <p className="mt-2 text-xs text-ink-mute">
        Prefer to start from something you already have?{" "}
        <Link href="/new" className="text-accent-ink hover:text-accent-soft">
          Upload a recording or paste a URL →
        </Link>
      </p>
    </Card>
  );
}

function Toggle({
  on,
  onClick,
  label,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        on ? "border-accent/50 bg-accent/[0.07]" : "border-line bg-surface-2 hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
          on ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-white transition-transform",
            on && "translate-x-4",
          )}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-mute">{hint}</span>
      </span>
    </button>
  );
}

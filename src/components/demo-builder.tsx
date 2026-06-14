"use client";

import { useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Step {
  id: string;
  url: string;
  tooltip: string;
  hotspot: { x: number; y: number }; // percentages 0-100
}

let seq = 0;

export function DemoBuilder({
  projectName,
  cta,
  endCard,
}: {
  projectName: string;
  cta: string;
  endCard: string;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const [playIndex, setPlayIndex] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Step[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `s${seq++}`,
        url: URL.createObjectURL(f),
        tooltip: "",
        hotspot: { x: 50, y: 50 },
      }));
    setSteps((s) => {
      const merged = [...s, ...next];
      setActive(s.length); // focus first new step
      return merged;
    });
  }

  function updateStep(id: string, patch: Partial<Step>) {
    setSteps((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  }

  function removeStep(id: string) {
    setSteps((s) => {
      const target = s.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const filtered = s.filter((x) => x.id !== id);
      setActive((a) => Math.max(0, Math.min(a, filtered.length - 1)));
      return filtered;
    });
  }

  function placeHotspot(e: React.MouseEvent<HTMLDivElement>, step: Step) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateStep(step.id, { hotspot: { x: clamp(x), y: clamp(y) } });
  }

  function startPlay() {
    setPlayIndex(0);
    setDone(false);
    setMode("play");
  }

  function advance() {
    if (playIndex >= steps.length - 1) setDone(true);
    else setPlayIndex((i) => i + 1);
  }

  /* ----------------------------------------------------------- Empty state */
  if (steps.length === 0) {
    return (
      <>
        <UploadInput ref={fileRef} onFiles={addFiles} />
        <Card
          className="flex flex-col items-center gap-4 border-dashed px-6 py-16 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex size-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-mute">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5h16v11H4zM4 16l5-5 4 4 3-3 4 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-medium text-ink">Build a clickable walkthrough</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-mute">
              Drop in screenshots of {projectName}, one per step. Place a hotspot
              and write a tooltip for each — then play it as a guided demo.
            </p>
          </div>
          <Button onClick={() => fileRef.current?.click()}>Upload screenshots</Button>
        </Card>
      </>
    );
  }

  /* ------------------------------------------------------------- Play mode */
  if (mode === "play") {
    const step = steps[playIndex];
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === playIndex && !done ? "w-6 bg-accent" : "w-1.5 bg-line-strong",
                )}
              />
            ))}
          </div>
          <button onClick={() => setMode("edit")} className="text-xs text-ink-mute hover:text-ink">
            Exit preview
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-line bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.url} alt="" className="block max-h-[60vh] w-full object-contain" />

          {!done && (
            <>
              <div className="absolute inset-0 bg-black/30" />
              <button
                onClick={advance}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${step.hotspot.x}%`, top: `${step.hotspot.y}%` }}
                aria-label="Next step"
              >
                <span className="relative flex size-7">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/60" />
                  <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-accent text-white shadow-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </button>
              {step.tooltip && (
                <div
                  className="absolute max-w-[260px] -translate-x-1/2 rounded-lg border border-line bg-base/95 px-3 py-2 text-sm text-ink shadow-xl backdrop-blur"
                  style={{
                    left: `${clamp(step.hotspot.x, 18, 82)}%`,
                    top: `calc(${step.hotspot.y}% + 26px)`,
                  }}
                >
                  {step.tooltip}
                </div>
              )}
            </>
          )}

          {done && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-center">
              <p className="text-lg font-medium text-white">You&apos;ve seen {projectName}.</p>
              <span className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white">
                {cta}
              </span>
              <p className="text-xs text-white/60">{endCard}</p>
              <button onClick={startPlay} className="mt-1 text-xs text-white/70 hover:text-white">
                Replay
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-ink-mute">
          {done ? "End of walkthrough." : "Click the glowing hotspot to continue."}
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------- Edit mode */
  const step = steps[active];
  return (
    <div>
      <UploadInput ref={fileRef} onFiles={addFiles} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-mute">
          {steps.length} step{steps.length === 1 ? "" : "s"} · click the screenshot to place its hotspot
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Add screenshots
          </Button>
          <Button size="sm" onClick={startPlay}>
            Play demo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* Stage */}
        <div>
          <div
            className="relative cursor-crosshair overflow-hidden rounded-xl border border-line bg-black"
            onClick={(e) => placeHotspot(e, step)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.url} alt="" className="block max-h-[58vh] w-full object-contain" />
            <span
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-lg"
              style={{ left: `${step.hotspot.x}%`, top: `${step.hotspot.y}%` }}
            />
          </div>
          <label className="mt-3 block text-sm font-medium text-ink">Tooltip for this step</label>
          <textarea
            value={step.tooltip}
            onChange={(e) => updateStep(step.id, { tooltip: e.target.value })}
            placeholder="Click here to create your first invoice…"
            className="mt-2 h-20 w-full resize-none rounded-lg border border-line bg-base p-3 text-sm text-ink-soft outline-none focus:border-accent/60"
          />
        </div>

        {/* Steps rail */}
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg border p-2 transition-colors",
                i === active ? "border-accent/50 bg-accent/[0.07]" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <button onClick={() => setActive(i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="font-mono text-xs text-ink-mute">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="h-10 w-16 shrink-0 rounded border border-line object-cover" />
                <span className="truncate text-xs text-ink-soft">
                  {s.tooltip || "No tooltip yet"}
                </span>
              </button>
              <button
                onClick={() => removeStep(s.id)}
                className="text-ink-faint opacity-0 transition-opacity hover:text-bad group-hover:opacity-100"
                aria-label="Remove step"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {["Copy embed code", "Add lead capture", "Share link", "Demo analytics"].map((a) => (
          <span
            key={a}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-mute"
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

const UploadInput = function UploadInput({
  ref,
  onFiles,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  onFiles: (f: FileList | null) => void;
}) {
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        onFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

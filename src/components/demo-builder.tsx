"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { saveBlob } from "@/lib/footage-store";
import { useStore } from "@/lib/store";
import { buildDemoFromScreenshots } from "@/lib/demo-prefill";
import { DEFAULT_BRAND_KIT } from "@/lib/mock-data";
import type { InteractiveDemo, InteractiveDemoStep, Project } from "@/lib/types";

export function DemoBuilder({ project }: { project: Project }) {
  const { attachInteractiveDemo } = useStore();
  const [steps, setSteps] = useState<InteractiveDemoStep[]>(() => {
    if (project.interactiveDemo?.steps.length) return project.interactiveDemo.steps;
    return buildDemoFromScreenshots(project)?.steps ?? [];
  });
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [cta, setCta] = useState(
    () => project.interactiveDemo?.cta ?? buildDemoFromScreenshots(project)?.cta ?? DEFAULT_BRAND_KIT.cta,
  );

  const addImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const newSteps: InteractiveDemoStep[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const key = `demo:${project.id}:${Date.now()}-${i}`;
      await saveBlob(key, project.id, file, "screenshot");
      const url = URL.createObjectURL(file);
      newSteps.push({
        id: `step-${Date.now()}-${i}`,
        imageKey: key,
        hotspot: { x: 0.5, y: 0.5 },
        tooltip: `Step ${steps.length + i + 1}`,
      });
      void url;
    }
    setSteps((s) => [...s, ...newSteps]);
  }, [project.id, steps.length]);

  const save = useCallback(() => {
    const demo: InteractiveDemo = { steps, cta };
    attachInteractiveDemo(project.id, demo);
  }, [steps, cta, project.id, attachInteractiveDemo]);

  useEffect(() => {
    if (mode !== "play" || !playing || steps.length === 0) return;
    const t = setTimeout(() => {
      if (playIndex >= steps.length - 1) {
        setPlaying(false);
      } else {
        setPlayIndex((i) => i + 1);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [mode, playing, playIndex, steps.length]);

  const current = steps[playIndex];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={mode === "edit" ? "primary" : "secondary"}
            onClick={() => { setMode("edit"); setPlaying(false); }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={mode === "play" ? "primary" : "secondary"}
            onClick={() => { setMode("play"); setPlayIndex(0); setPlaying(true); }}
          >
            Play walkthrough
          </Button>
        </div>

        {mode === "edit" && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-6 py-10 text-center hover:border-accent/40">
            <span className="text-sm font-medium text-ink">Drop screenshots here</span>
            <span className="mt-1 text-xs text-ink-mute">One image per step</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void addImages(e.target.files)}
            />
          </label>
        )}

        {steps.length > 0 && (
          <div className="mt-4 space-y-4">
            {steps.map((step) => (
              <StepEditor
                key={step.id}
                step={step}
                active={activeStep === step.id}
                onSelect={() => setActiveStep(step.id)}
                onHotspot={(x, y) => {
                  setSteps((s) =>
                    s.map((st) => (st.id === step.id ? { ...st, hotspot: { x, y } } : st)),
                  );
                }}
                onTooltip={(t) => {
                  setSteps((s) =>
                    s.map((st) => (st.id === step.id ? { ...st, tooltip: t } : st)),
                  );
                }}
                onRemove={() => setSteps((s) => s.filter((st) => st.id !== step.id))}
              />
            ))}
          </div>
        )}

        {mode === "play" && current && (
          <PlayStep step={current} cta={cta} isLast={playIndex >= steps.length - 1} />
        )}
      </div>

      <Card className="p-5 space-y-4">
        <p className="text-sm font-medium text-ink">Walkthrough settings</p>
        <label className="block text-xs text-ink-mute">
          End CTA
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
          />
        </label>
        <Pill>{steps.length} steps</Pill>
        <Button className="w-full" onClick={save}>Save interactive demo</Button>
      </Card>
    </div>
  );
}

function StepEditor({
  step,
  active,
  onSelect,
  onHotspot,
  onTooltip,
  onRemove,
}: {
  step: InteractiveDemoStep;
  active: boolean;
  onSelect: () => void;
  onHotspot: (x: number, y: number) => void;
  onTooltip: (t: string) => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void import("@/lib/footage-store").then(({ getBlobUrl }) =>
      getBlobUrl(step.imageKey, "footage").then(setUrl),
    );
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [step.imageKey, url]);

  return (
    <div className={cn("rounded-xl border p-3", active ? "border-accent/50" : "border-line")}>
      <div
        className="relative cursor-crosshair overflow-hidden rounded-lg border border-line"
        onClick={(e) => {
          onSelect();
          const rect = e.currentTarget.getBoundingClientRect();
          onHotspot(
            (e.clientX - rect.left) / rect.width,
            (e.clientY - rect.top) / rect.height,
          );
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full" />
        ) : (
          <div className="aspect-video bg-surface-2" />
        )}
        <span
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/30 animate-pulse-soft"
          style={{ left: `${step.hotspot.x * 100}%`, top: `${step.hotspot.y * 100}%` }}
        />
      </div>
      <input
        value={step.tooltip}
        onChange={(e) => onTooltip(e.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm"
        placeholder="Tooltip text"
      />
      <Button size="sm" variant="ghost" className="mt-2" onClick={onRemove}>Remove</Button>
    </div>
  );
}

function PlayStep({
  step,
  cta,
  isLast,
}: {
  step: InteractiveDemoStep;
  cta: string;
  isLast: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void import("@/lib/footage-store").then(({ getBlobUrl }) =>
      getBlobUrl(step.imageKey, "footage").then(setUrl),
    );
  }, [step.imageKey]);

  return (
    <div className="relative rounded-xl border border-line overflow-hidden">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full" />
      ) : null}
      <div
        className="absolute max-w-xs rounded-xl border border-accent/50 bg-base/95 px-4 py-3 text-sm shadow-lg"
        style={{
          left: `${Math.min(step.hotspot.x * 100, 70)}%`,
          top: `${Math.min(step.hotspot.y * 100, 70)}%`,
        }}
      >
        {step.tooltip}
      </div>
      {isLast && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-base/90 p-6 text-center">
          <p className="text-lg font-semibold text-ink">{cta}</p>
          <p className="mt-1 text-xs text-ink-mute">Made with LaunchReel</p>
        </div>
      )}
    </div>
  );
}

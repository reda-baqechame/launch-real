"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { agentJsonHeaders } from "@/lib/ai";
import { useAiEnabled } from "@/lib/hosted-config";
import { footageKey, saveBlob } from "@/lib/footage-store";
import { screenshotsToVideo } from "@/lib/screenshots-to-video";
import { useStore } from "@/lib/store";
import type { ClickEvent } from "@/lib/types";

interface DemoPlan {
  steps: { goal: string; action: string }[];
  avoid: string[];
}

interface AgentCapturePanelProps {
  url: string;
  contextLine: string;
  instructions?: string;
  onCancel: () => void;
}

const PLANNING_STEPS = [
  "Reading your product context…",
  "Choosing the strongest demo path…",
  "Drafting step-by-step actions…",
];

type Phase = "idle" | "planning" | "review-plan" | "capturing" | "error";
type FailedAt = "plan" | "capture";

export function AgentCapturePanel({
  url,
  contextLine,
  instructions,
  onCancel,
}: AgentCapturePanelProps) {
  const router = useRouter();
  const { createProject, attachFootage } = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<DemoPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAt, setFailedAt] = useState<FailedAt | null>(null);
  const [planningStep, setPlanningStep] = useState(0);
  const [captureStep, setCaptureStep] = useState(0);

  const captureSteps = useMemo(() => {
    const planGoals = plan?.steps.map((s) => s.goal) ?? ["Exploring your app"];
    return ["Launching browser", "Loading your app", ...planGoals, "Saving recording"];
  }, [plan]);

  useEffect(() => {
    if (phase !== "planning") return;
    const interval = setInterval(() => {
      setPlanningStep((s) => Math.min(s + 1, PLANNING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "capturing") return;
    const interval = setInterval(() => {
      setCaptureStep((s) => Math.min(s + 1, captureSteps.length - 1));
    }, 7000);
    return () => clearInterval(interval);
  }, [phase, captureSteps.length]);

  const aiEnabled = useAiEnabled();

  const loadPlan = useCallback(async () => {
    if (!aiEnabled) {
      setError("Sign in or connect an Anthropic key on this page first.");
      setFailedAt("plan");
      setPhase("error");
      return;
    }
    setPhase("planning");
    setPlanningStep(0);
    setError(null);
    setFailedAt(null);
    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: await agentJsonHeaders(),
        body: JSON.stringify({ url, contextLine, instructions }),
      });
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error || "Plan failed.");
      }
      setPlan((await res.json()) as DemoPlan);
      setPhase("review-plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan failed.");
      setFailedAt("plan");
      setPhase("error");
    }
  }, [url, contextLine, instructions, aiEnabled]);

  const runCapture = useCallback(async () => {
    if (!aiEnabled) {
      setError("Sign in or connect an Anthropic key on this page first.");
      setFailedAt("capture");
      setPhase("error");
      return;
    }
    setPhase("capturing");
    setCaptureStep(0);
    setError(null);
    setFailedAt(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: await agentJsonHeaders(),
        body: JSON.stringify({ url, contextLine, plan, instructions }),
      });
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error || "Capture failed.");
      }
      const data = (await res.json()) as {
        videoBase64: string | null;
        clicks: ClickEvent[];
        screenshots: string[];
        mimeType: string;
        partial?: boolean;
      };

      const p = createProject({ url, description: contextLine });
      const blobKey = footageKey(p.id);

      if (data.videoBase64) {
        const binary = atob(data.videoBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mimeType });
        await saveBlob(blobKey, p.id, blob, "footage");
        attachFootage(p.id, {
          projectId: p.id,
          kind: "agent",
          hasAudio: false,
          clickCount: data.clicks.length,
          blobKey,
          clicks: data.clicks,
        });
      } else if (data.screenshots.length > 0) {
        const blob = await screenshotsToVideo(
          data.screenshots.map((b64) => `data:image/jpeg;base64,${b64}`),
        );
        await saveBlob(blobKey, p.id, blob, "footage");
        attachFootage(p.id, {
          projectId: p.id,
          kind: "screenshots",
          hasAudio: false,
          clickCount: 0,
          blobKey,
        });
      }

      router.push(`/projects/${p.id}/audit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed.");
      setFailedAt("capture");
      setPhase("error");
    }
  }, [url, contextLine, plan, instructions, createProject, attachFootage, router, aiEnabled]);

  if (phase === "idle") {
    return (
      <Card className="mt-4 p-5">
        <p className="text-sm text-ink-mute">
          LaunchReel will explore <span className="text-ink">{url}</span> and record a demo automatically.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void loadPlan()}>Plan demo</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    );
  }

  if (phase === "planning") {
    return (
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-3">
          <span className="inline-block size-6 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
          <p className="text-sm font-medium text-ink">Planning your demo</p>
        </div>
        <ul className="mt-4 space-y-2">
          {PLANNING_STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-sm",
                i <= planningStep ? "text-ink" : "text-ink-faint",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  i < planningStep
                    ? "bg-good/20 text-good"
                    : i === planningStep
                      ? "bg-accent/20 text-accent-ink animate-pulse-soft"
                      : "bg-surface-2 text-ink-faint",
                )}
              >
                {i < planningStep ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (phase === "capturing") {
    const progress = Math.round(((captureStep + 1) / captureSteps.length) * 100);
    return (
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-3">
          <span className="inline-block size-6 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
          <div>
            <p className="text-sm font-medium text-ink">Exploring your app</p>
            <p className="text-xs text-ink-mute">Driving {url}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="mt-4 space-y-2">
          {captureSteps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-sm",
                i <= captureStep ? "text-ink" : "text-ink-faint",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  i < captureStep
                    ? "bg-good/20 text-good"
                    : i === captureStep
                      ? "bg-accent/20 text-accent-ink animate-pulse-soft"
                      : "bg-surface-2 text-ink-faint",
                )}
              >
                {i < captureStep ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-mute">
          This can take up to 90 seconds — keep this tab open.
        </p>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card className="mt-4 p-5">
        <p className="text-sm text-bad">{error}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {failedAt === "capture" && plan ? (
            <>
              <Button size="sm" onClick={() => void runCapture()}>Retry capture</Button>
              <Button size="sm" variant="secondary" onClick={() => void loadPlan()}>Replan demo</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => void loadPlan()}>Retry plan</Button>
          )}
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-5">
      <p className="text-sm font-medium text-ink">Demo plan — approve before we explore</p>
      <ul className="mt-3 space-y-2">
        {plan?.steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
            <span className="font-medium text-ink">{s.goal}</span>
            <span className="text-ink-mute"> — {s.action}</span>
          </li>
        ))}
      </ul>
      {plan?.avoid?.length ? (
        <p className="mt-3 text-xs text-ink-mute">Avoid: {plan.avoid.join(", ")}</p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button onClick={() => void runCapture()}>Explore &amp; record</Button>
        <Button variant="secondary" onClick={() => void loadPlan()}>Replan</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

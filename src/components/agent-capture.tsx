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
  stopWhen?: string;
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

function screenshotDataUrl(base64: string): string {
  const mime = base64.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

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
  const [goal, setGoal] = useState("Show the core workflow and the final payoff.");
  const [extraInstructions, setExtraInstructions] = useState(instructions ?? "");
  const [avoidText, setAvoidText] = useState("billing, destructive actions, real payments");
  const [stopWhen, setStopWhen] = useState("The app's main payoff or dashboard is visible.");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  const avoid = useMemo(
    () =>
      avoidText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [avoidText],
  );

  const requestPayload = useCallback(
    () => ({
      url,
      contextLine,
      instructions: extraInstructions,
      goal,
      avoid,
      stopWhen,
      credentials:
        username.trim() || password
          ? { username: username.trim(), password }
          : undefined,
    }),
    [url, contextLine, extraInstructions, goal, avoid, stopWhen, username, password],
  );

  const planPayload = useCallback(
    () => ({
      url,
      contextLine,
      instructions: extraInstructions,
      goal,
      avoid,
      stopWhen,
      hasCredentials: Boolean(username.trim() || password),
    }),
    [url, contextLine, extraInstructions, goal, avoid, stopWhen, username, password],
  );

  const clearCredentials = useCallback(() => {
    setUsername("");
    setPassword("");
  }, []);

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
        body: JSON.stringify(planPayload()),
      });
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error || "Plan failed.");
      }
      const nextPlan = (await res.json()) as DemoPlan;
      setPlan({ ...nextPlan, stopWhen: nextPlan.stopWhen || stopWhen });
      setPhase("review-plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan failed.");
      setFailedAt("plan");
      setPhase("error");
    }
  }, [planPayload, aiEnabled, stopWhen]);

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
        body: JSON.stringify({ ...requestPayload(), plan }),
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
        captureMode: "video" | "screenshots";
        partial?: boolean;
        failureReason?: string | null;
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
        const screenshotUrls = data.screenshots.map(screenshotDataUrl);
        const screenshotKeys = await Promise.all(
          screenshotUrls.map(async (dataUrl, index) => {
            const screenshotKey = `screenshot:${p.id}:agent:${index}`;
            const screenshotBlob = await (await fetch(dataUrl)).blob();
            await saveBlob(screenshotKey, p.id, screenshotBlob, "screenshot");
            return screenshotKey;
          }),
        );
        const blob = await screenshotsToVideo(screenshotUrls);
        await saveBlob(blobKey, p.id, blob, "footage");
        attachFootage(p.id, {
          projectId: p.id,
          kind: "screenshots",
          hasAudio: false,
          clickCount: 0,
          blobKey,
          screenshotKeys,
        });
      }

      clearCredentials();
      router.push(`/projects/${p.id}/audit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed.");
      setFailedAt("capture");
      setPhase("error");
    } finally {
      clearCredentials();
    }
  }, [requestPayload, plan, createProject, attachFootage, router, aiEnabled, url, contextLine, clearCredentials]);

  const cancel = useCallback(() => {
    clearCredentials();
    onCancel();
  }, [clearCredentials, onCancel]);

  if (phase === "idle") {
    return (
      <Card className="mt-4 p-5">
        <p className="text-sm text-ink-mute">
          LaunchReel will explore <span className="text-ink">{url}</span> and record a demo automatically.
        </p>
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-medium text-ink-soft">
            Demo goal
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Extra instructions
            <textarea
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              rows={2}
              placeholder="Example: log in, create a sample invoice, show export, then open dashboard"
              className="mt-1 w-full resize-none rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Avoid
            <input
              value={avoidText}
              onChange={(e) => setAvoidText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Stop when
            <input
              value={stopWhen}
              onChange={(e) => setStopWhen(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink-soft">
              Test login email or username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs font-medium text-ink-soft">
              Test password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>
          <p className="text-xs text-ink-mute">
            Use disposable test credentials only. Login runs before recording and credentials are not saved, but the captured app may show account identity.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void loadPlan()}>Plan demo</Button>
          <Button variant="secondary" onClick={cancel}>Cancel</Button>
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
          <Button size="sm" variant="secondary" onClick={cancel}>Cancel</Button>
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
      <div className="mt-4 space-y-3">
        {plan?.steps.map((s, i) => (
          <div key={`edit-${i}`} className="rounded-lg border border-line bg-base p-3">
            <label className="block text-xs font-medium text-ink-soft">
              Step {i + 1} goal
              <input
                value={s.goal}
                onChange={(e) =>
                  setPlan((current) =>
                    current
                      ? {
                          ...current,
                          steps: current.steps.map((step, idx) =>
                            idx === i ? { ...step, goal: e.target.value } : step,
                          ),
                        }
                      : current,
                  )
                }
                className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink"
              />
            </label>
            <label className="mt-2 block text-xs font-medium text-ink-soft">
              Step {i + 1} action
              <textarea
                value={s.action}
                onChange={(e) =>
                  setPlan((current) =>
                    current
                      ? {
                          ...current,
                          steps: current.steps.map((step, idx) =>
                            idx === i ? { ...step, action: e.target.value } : step,
                          ),
                        }
                      : current,
                  )
                }
                rows={2}
                className="mt-1 w-full resize-none rounded border border-line bg-surface px-2 py-1 text-sm text-ink"
              />
            </label>
          </div>
        ))}
        <label className="block text-xs font-medium text-ink-soft">
          Avoid
          <input
            value={plan?.avoid?.join(", ") ?? avoidText}
            onChange={(e) => {
              const nextAvoid = e.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              setPlan((current) => (current ? { ...current, avoid: nextAvoid } : current));
              setAvoidText(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block text-xs font-medium text-ink-soft">
          Stop when
          <input
            value={plan?.stopWhen ?? stopWhen}
            onChange={(e) =>
              setPlan((current) => (current ? { ...current, stopWhen: e.target.value } : current))
            }
            className="mt-1 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => void runCapture()}>Explore &amp; record</Button>
        <Button variant="secondary" onClick={() => void loadPlan()}>Replan</Button>
        <Button variant="secondary" onClick={cancel}>Cancel</Button>
      </div>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { clearKey, fetchAngles, fetchAudit, setKey, useAnthropicKey } from "@/lib/ai";
import type { AiAudit, StoryAngle } from "@/lib/types";

const SOURCE_OPTIONS = [
  { id: "record", label: "Record screen", icon: "M15 10l4.5-2.6v9.2L15 14M3 7h12v10H3z" },
  { id: "recording", label: "Upload recording", icon: "M12 16V4M6 10l6-6 6 6M4 20h16" },
  { id: "screens", label: "Upload screenshots", icon: "M4 5h16v11H4zM4 16l5-5 4 4 3-3 4 4" },
  { id: "prd", label: "Paste PRD / changelog", icon: "M7 4h7l4 4v12H7zM14 4v4h4" },
  { id: "ph", label: "Connect Product Hunt draft", icon: "M5 3h14v18l-7-4-7 4z" },
  { id: "agent", label: "Give agent access", icon: "M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5zM4 20a8 8 0 0116 0" },
];

const ANALYZING_STEPS = [
  "Reading your product…",
  "Auditing positioning and clarity…",
  "Finding the strongest launch angle…",
  "Scoring demo strength and proof…",
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useStore();
  const aiKey = useAnthropicKey();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function analyze() {
    setAiError(null);
    setStep(0);
    setAnalyzing(true);

    // Run the real audit + angle generation in parallel while steps animate.
    const auditPromise: Promise<AiAudit | undefined> = aiKey
      ? fetchAudit({ url, description }).catch((e: unknown) => {
          setAiError(e instanceof Error ? e.message : "Audit failed.");
          return undefined;
        })
      : Promise.resolve(undefined);
    const anglesPromise: Promise<StoryAngle[] | undefined> = aiKey
      ? fetchAngles({ url, description }).catch(() => undefined)
      : Promise.resolve(undefined);

    for (let i = 1; i < ANALYZING_STEPS.length; i++) {
      await delay(650);
      setStep(i);
    }

    const [ai, angles] = await Promise.all([auditPromise, anglesPromise]);
    const project = createProject({ url, description }, ai, angles);
    router.push(`/projects/${project.id}/audit`);
  }

  if (analyzing) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-surface">
          <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-ink">Analyzing your launch</h1>
        <p className="mt-2 text-sm text-ink-mute">
          {aiKey
            ? "Auditing with Claude before it generates."
            : "LaunchReel thinks before it generates."}
        </p>
        <ul className="mt-8 w-full space-y-2 text-left">
          {ANALYZING_STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                i < step
                  ? "border-line bg-surface text-ink-soft"
                  : i === step
                    ? "border-accent/40 bg-accent/10 text-ink"
                    : "border-line bg-surface/50 text-ink-faint",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  i < step ? "bg-good/20 text-good" : i === step ? "bg-accent/20 text-accent-ink animate-pulse-soft" : "bg-surface-2 text-ink-faint",
                )}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow>New launch kit</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">What are you launching?</h1>
      <p className="mt-2 text-ink-mute">
        Paste your product. LaunchReel understands it before it makes anything.
      </p>

      <Card className="mt-8 p-6">
        <label className="text-sm font-medium text-ink">Your app URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourapp.com"
          className="mt-2 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60"
        />

        <p className="mt-6 text-sm font-medium text-ink">Optional — add more signal</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SOURCE_OPTIONS.map((opt) => {
            const on = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  on
                    ? "border-accent/50 bg-accent/10 text-ink"
                    : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={opt.icon} />
                </svg>
                <span className="flex-1">{opt.label}</span>
                {on && <span className="text-accent-ink">✓</span>}
              </button>
            );
          })}
        </div>

        <label className="mt-6 block text-sm font-medium text-ink">
          What does it do, and who is it for?
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: AI tool that turns SaaS recordings into launch videos for indie hackers"
          className="mt-2 w-full resize-none rounded-lg border border-line bg-base px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60"
        />

        <AiConnect connected={!!aiKey} />

        {aiError && (
          <p className="mt-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            {aiError} — falling back to the built-in audit.
          </p>
        )}

        <Button onClick={analyze} size="lg" className="mt-5 w-full">
          {aiKey ? "Analyze my launch with Claude" : "Analyze my launch"}
        </Button>
      </Card>
    </div>
  );
}

/** Optional bring-your-own-key panel that powers the real Launch Doctor. */
function AiConnect({ connected }: { connected: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              connected ? "bg-good" : "bg-ink-faint",
            )}
          />
          <p className="text-sm font-medium text-ink">
            {connected ? "Launch Doctor connected to Claude" : "Use real AI (optional)"}
          </p>
        </div>
        {connected ? (
          <button
            onClick={() => clearKey()}
            className="text-xs text-ink-mute hover:text-ink"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-accent-ink hover:text-accent-soft"
          >
            {open ? "Cancel" : "Connect"}
          </button>
        )}
      </div>

      {connected ? (
        <p className="mt-1.5 text-xs text-ink-mute">
          Your audit, score, and hook are generated by claude-opus-4-8 using your
          key. Stored only in this browser.
        </p>
      ) : open ? (
        <div className="mt-3">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-mute">
              Sent only to generate your audit. Never stored on our servers.
            </p>
            <Button
              size="sm"
              disabled={!value.trim().startsWith("sk-")}
              onClick={() => {
                setKey(value);
                setValue("");
                setOpen(false);
              }}
            >
              Save key
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-ink-mute">
          Connect your Anthropic key and the Launch Doctor becomes a real Claude
          audit. Without it, LaunchReel uses its built-in generator.
        </p>
      )}
    </div>
  );
}

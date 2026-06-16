"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { AgentCapturePanel } from "@/components/agent-capture";
import { MediaIntake } from "@/components/media-intake";
import { PhDraftIntake } from "@/components/ph-draft-intake";
import { clearKey, clearTtsKey, fetchAudit, setKey, setTtsKey, useAnthropicKey, useTtsKey } from "@/lib/ai";
import { saveRecordingFootage, saveScreenshotFootage } from "@/lib/footage-intake";
import { buildRecordReturnUrl } from "@/lib/record-return";
import type { PhDraftPrefill } from "@/lib/ph-intake";
import { storageErrorMessage } from "@/lib/storage-errors";
import type { AiAudit, Project } from "@/lib/types";

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
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center text-sm text-ink-mute">
          Loading…
        </div>
      }
    >
      <NewProjectPageWithResume />
    </Suspense>
  );
}

function NewProjectPageWithResume() {
  const searchParams = useSearchParams();
  const { hydrated, getProject } = useStore();
  const resumeId = searchParams.get("project");
  const resumeProject =
    hydrated && resumeId ? (getProject(resumeId) ?? null) : null;
  const remountKey = hydrated
    ? resumeProject?.footage?.blobKey
      ? `resumed:${resumeId}`
      : "fresh"
    : "hydrating";

  return (
    <NewProjectPageInner key={remountKey} resumeProject={resumeProject} />
  );
}

function NewProjectPageInner({ resumeProject }: { resumeProject: Project | null }) {
  const router = useRouter();
  const { createProject, attachFootage, patchProject, getProject } = useStore();
  const aiKey = useAnthropicKey();
  const ttsKey = useTtsKey();
  const [showAgent, setShowAgent] = useState(false);
  const returnedProjectId = resumeProject?.footage?.blobKey ? resumeProject.id : null;
  const recordSaved = Boolean(resumeProject?.footage?.blobKey);
  const [url, setUrl] = useState(() =>
    resumeProject?.url && resumeProject.url !== "https://example.com"
      ? resumeProject.url
      : "",
  );
  const [description, setDescription] = useState(
    () => resumeProject?.oneLiner ?? "",
  );
  const [selected, setSelected] = useState<string[]>(() =>
    resumeProject?.footage?.blobKey ? ["record"] : [],
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [prdText, setPrdText] = useState("");
  const [phDraftUrl, setPhDraftUrl] = useState<string | null>(null);
  const [savingFootage, setSavingFootage] = useState(false);
  function handlePhPrefill(data: PhDraftPrefill) {
    setPhDraftUrl(data.phUrl);
    setUrl(data.productUrl);
    const desc = [data.tagline ? `${data.name}: ${data.tagline}` : data.name]
      .filter(Boolean)
      .join("\n");
    if (desc) setDescription(desc);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      if (!next.includes("recording")) setRecordingFile(null);
      if (!next.includes("screens")) setScreenshotFiles([]);
      if (!next.includes("prd")) setPrdText("");
      return next;
    });
  }

  async function analyze() {
    setAiError(null);
    setUploadError(null);

    const wantsRecording = selected.includes("recording");
    const wantsScreens = selected.includes("screens");
    const hasFootage =
      Boolean(recordingFile || screenshotFiles.length) ||
      Boolean(returnedProjectId && getProject(returnedProjectId)?.footage?.blobKey);
    const hasTextSignal = Boolean(url.trim() || description.trim() || prdText.trim());

    if (wantsRecording && !recordingFile && !wantsScreens && !hasTextSignal) {
      setUploadError("Add a recording or describe your product.");
      return;
    }
    if (wantsScreens && !screenshotFiles.length && !wantsRecording && !hasTextSignal) {
      setUploadError("Add screenshots or describe your product.");
      return;
    }
    if ((wantsRecording || wantsScreens) && !hasFootage && !hasTextSignal) {
      setUploadError("Add media or describe your product to continue.");
      return;
    }

    setStep(0);
    setAnalyzing(true);

    const auditPromise: Promise<AiAudit | undefined> = aiKey
      ? fetchAudit({
          url,
          description: [
            description,
            selected.includes("prd") && prdText.trim() ? `PRD/changelog:\n${prdText.trim()}` : "",
            selected.includes("ph") && phDraftUrl ? `Product Hunt draft: ${phDraftUrl}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        }).catch((e: unknown) => {
          setAiError(e instanceof Error ? e.message : "Audit failed.");
          return undefined;
        })
      : Promise.resolve(undefined);

    for (let i = 1; i < ANALYZING_STEPS.length; i++) {
      await delay(650);
      setStep(i);
    }

    const ai = await auditPromise;

    let project;
    if (returnedProjectId) {
      project =
        patchProject(returnedProjectId, {
          url: url.trim() || undefined,
          oneLiner: description.trim() || undefined,
        }) ?? getProject(returnedProjectId);
      if (!project) {
        setAnalyzing(false);
        setUploadError("Could not resume your recording session.");
        return;
      }
    } else {
      project = createProject(
        {
          url,
          description,
          prdText: selected.includes("prd") ? prdText : undefined,
          fromRecording: Boolean(recordingFile || screenshotFiles.length),
        },
        ai,
      );

      if (hasFootage && !returnedProjectId) {
        setSavingFootage(true);
        try {
          if (recordingFile) {
            const { meta } = await saveRecordingFootage(project.id, recordingFile);
            attachFootage(project.id, meta);
          } else {
            const { meta } = await saveScreenshotFootage(project.id, screenshotFiles);
            attachFootage(project.id, meta);
          }
        } catch (e) {
          setAnalyzing(false);
          setSavingFootage(false);
          setUploadError(storageErrorMessage(e));
          return;
        }
        setSavingFootage(false);
      }
    }

    router.push(`/projects/${project!.id}/audit`);
  }

  if (analyzing) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-surface">
          <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-ink">Analyzing your launch</h1>
        <p className="mt-2 text-sm text-ink-mute">
          {savingFootage
            ? "Saving your media locally…"
            : aiKey
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
        <label htmlFor="app-url" className="text-sm font-medium text-ink">Your app URL</label>
        <input
          id="app-url"
          name="url"
          type="url"
          autoComplete="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourapp.com"
          className="mt-2 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60"
        />

        <p id="source-options-label" className="mt-6 text-sm font-medium text-ink">Optional — add more signal</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="source-options-label">
          {SOURCE_OPTIONS.map((opt) => {
            const on = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={on}
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

        <MediaIntake
          showRecording={selected.includes("recording")}
          showScreenshots={selected.includes("screens")}
          recordingFile={recordingFile}
          screenshotFiles={screenshotFiles}
          onRecordingChange={setRecordingFile}
          onScreenshotsChange={setScreenshotFiles}
        />

        {selected.includes("record") && (
          <p className="mt-3 text-sm text-ink-mute">
            {recordSaved ? (
              <span className="text-good">Screen recording saved — continue below and analyze.</span>
            ) : (
              <>
                Prefer in-browser capture?{" "}
                <Link
                  href={buildRecordReturnUrl({ url, description, prdText })}
                  className="text-accent-ink hover:text-accent-soft"
                >
                  Open the screen recorder →
                </Link>
              </>
            )}
          </p>
        )}

        {selected.includes("prd") && (
          <>
            <label htmlFor="prd-text" className="mt-4 block text-sm font-medium text-ink">PRD / changelog</label>
            <textarea
              id="prd-text"
              name="prd"
              rows={5}
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              placeholder="Paste your PRD, changelog, or feature list — LaunchReel uses this for audit and script context."
              className="mt-2 w-full resize-none rounded-lg border border-line bg-base px-4 py-3 text-sm text-ink outline-none focus:border-accent/60"
            />
          </>
        )}

        {selected.includes("ph") && (
          <PhDraftIntake onPrefill={handlePhPrefill} />
        )}

        <label htmlFor="product-description" className="mt-6 block text-sm font-medium text-ink">
          What does it do, and who is it for?
        </label>
        <textarea
          id="product-description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: AI tool that turns SaaS recordings into launch videos for indie hackers"
          className="mt-2 w-full resize-none rounded-lg border border-line bg-base px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60"
        />

        <AiConnect connected={!!aiKey} />
        <TtsConnect connected={!!ttsKey} />

        {uploadError && (
          <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">
            {uploadError}
          </p>
        )}

        {aiError && (
          <p className="mt-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            {aiError} — falling back to the built-in audit.
          </p>
        )}

        {selected.includes("agent") && url.trim() && description.trim() ? (
          showAgent ? (
            <AgentCapturePanel
              url={url.startsWith("http") ? url : `https://${url}`}
              contextLine={description}
              onCancel={() => setShowAgent(false)}
            />
          ) : (
            <Button onClick={() => setShowAgent(true)} size="lg" className="mt-5 w-full">
              Explore URL with agent →
            </Button>
          )
        ) : (
          <Button onClick={analyze} size="lg" className="mt-5 w-full">
            {aiKey ? "Analyze my launch with Claude" : "Analyze my launch"}
          </Button>
        )}

        {url.trim() && !selected.includes("agent") && (
          <p className="mt-3 text-center text-xs text-ink-mute">
            Tip: select &quot;Give agent access&quot; to let LaunchReel explore your URL automatically.
          </p>
        )}
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
            aria-hidden
          />
          <p className="text-sm font-medium text-ink">
            {connected ? "Launch Doctor connected to Claude" : "Use real AI (optional)"}
          </p>
        </div>
        {connected ? (
          <button
            onClick={() => clearKey()}
            className="text-xs text-ink-mute hover:text-ink"
            type="button"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-accent-ink hover:text-accent-soft"
            type="button"
            aria-expanded={open}
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
            id="anthropic-key"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-..."
            aria-label="Anthropic API key"
            autoComplete="off"
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

function TtsConnect({ connected }: { connected: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [provider, setProvider] = useState<"elevenlabs" | "openai">("elevenlabs");

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", connected ? "bg-good" : "bg-ink-faint")} aria-hidden />
          <p className="text-sm font-medium text-ink">
            {connected ? "AI voice connected" : "AI voiceover (optional — shy founder mode)"}
          </p>
        </div>
        {connected ? (
          <button onClick={() => clearTtsKey()} className="text-xs text-ink-mute hover:text-ink" type="button">
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-accent-ink hover:text-accent-soft"
            type="button"
            aria-expanded={open}
          >
            {open ? "Cancel" : "Connect"}
          </button>
        )}
      </div>
      {connected ? (
        <p className="mt-1.5 text-xs text-ink-mute">
          LaunchReel narrates your video — you never speak on camera.
        </p>
      ) : open ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="tts-provider" className="sr-only">Voice provider</label>
          <select
            id="tts-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "elevenlabs" | "openai")}
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm"
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI TTS</option>
          </select>
          <input
            id="tts-key"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={provider === "openai" ? "sk-..." : "xi-..."}
            aria-label={`${provider === "openai" ? "OpenAI" : "ElevenLabs"} API key`}
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm"
          />
          <Button
            size="sm"
            disabled={!value.trim()}
            onClick={() => {
              setTtsKey(value, provider);
              setValue("");
              setOpen(false);
            }}
          >
            Save TTS key
          </Button>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-ink-mute">
          Without a voice key, videos still render with captions + music — no founder voice needed.
        </p>
      )}
    </div>
  );
}

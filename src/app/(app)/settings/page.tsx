"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Eyebrow } from "@/components/ui";
import { getSyncableProjects } from "@/lib/store";
import { uploadProjectsBlobs } from "@/lib/blob-cloud-sync";
import { SettingsAuthGate, SettingsSignInButton } from "@/components/settings-auth-gate";

interface IntegrationStatus {
  cloudSync: boolean;
  blobStorage: boolean;
  stripe: boolean;
  trigger: boolean;
  remotionLambda: boolean;
  youtubeOAuth: boolean;
  productHuntOAuth: boolean;
  connections: { provider: string; connected: boolean }[];
}

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function IntegrationsPanel({
  status,
  queueBusy,
  queueMsg,
  backupBusy,
  backupMsg,
  renderJobs,
  onEnqueue,
  onBackupBlobs,
}: {
  status: IntegrationStatus | null;
  queueBusy: boolean;
  queueMsg: string | null;
  backupBusy: boolean;
  backupMsg: string | null;
  renderJobs: { id: string; projectId: string; status: string; createdAt: string }[];
  onEnqueue: () => void;
  onBackupBlobs: () => void;
}) {
  return (
    <div className="mt-8 grid gap-4">
      <Card className="p-5">
        <h2 className="font-medium text-ink">Project sync</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {status?.cloudSync
            ? "Signed-in projects sync to Postgres automatically."
            : "Set DATABASE_URL + Clerk keys in .env.local."}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium text-ink">Media backup (S3 / R2)</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {status?.blobStorage
            ? "Footage and renders upload to object storage on sign-in. Run a manual backup anytime."
            : "Set S3_BUCKET + AWS credentials (or R2 endpoint) in .env.local."}
        </p>
        {status?.blobStorage && status.cloudSync && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={backupBusy}
            onClick={onBackupBlobs}
          >
            {backupBusy ? "Uploading…" : "Backup local media now"}
          </Button>
        )}
        {backupMsg && <p className="mt-2 text-xs text-ink-soft">{backupMsg}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="font-medium text-ink">Render queue</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {status?.trigger
            ? "Trigger.dev dispatch enabled for cloud renders."
            : "Client-side render by default. Set TRIGGER_* for cloud queue."}
        </p>
        <p className="mt-1 text-xs text-ink-mute">
          Cloud renders cover the base video (16:9 / 9:16 / 1:1). Cinematic shots, the
          AI presenter, and the three deliverables render in your browser.
        </p>
        {status?.cloudSync && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={queueBusy}
            onClick={onEnqueue}
          >
            {queueBusy ? "Queueing…" : "Enqueue test render"}
          </Button>
        )}
        {queueMsg && <p className="mt-2 text-xs text-ink-soft">{queueMsg}</p>}
        {renderJobs.length > 0 && (
          <ul className="mt-3 space-y-2 text-xs">
            {renderJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-ink-soft"
              >
                <span className="truncate font-mono">{job.id.slice(0, 18)}…</span>
                <span className="ml-2 shrink-0 capitalize text-ink-mute">{job.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-medium text-ink">Publish connections</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
            <span>YouTube</span>
            {status?.connections.find((c) => c.provider === "youtube")?.connected ? (
              <span className="text-good">Connected</span>
            ) : status?.youtubeOAuth ? (
              <Link href="/api/oauth/youtube/authorize" className="text-accent-ink hover:text-accent-soft">
                Connect →
              </Link>
            ) : (
              <span className="text-ink-faint">Not configured</span>
            )}
          </li>
          <li className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
            <span>Product Hunt</span>
            {status?.connections.find((c) => c.provider === "producthunt")?.connected ? (
              <span className="text-good">Connected</span>
            ) : status?.productHuntOAuth ? (
              <Link href="/api/oauth/producthunt/authorize" className="text-accent-ink hover:text-accent-soft">
                Connect →
              </Link>
            ) : (
              <span className="text-ink-faint">Not configured</span>
            )}
          </li>
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium text-ink">Remotion Lambda</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {status?.remotionLambda
            ? "AWS Lambda render endpoint configured."
            : "Set REMOTION_LAMBDA_FUNCTION_NAME + AWS credentials."}
        </p>
      </Card>
    </div>
  );
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const oauthNotice = searchParams.get("oauth");
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [renderJobs, setRenderJobs] = useState<
    { id: string; projectId: string; status: string; createdAt: string }[]
  >([]);

  const load = useCallback(() => {
    void fetch("/api/integrations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));

    void fetch("/api/render-queue")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { jobs?: { id: string; projectId: string; status: string; createdAt: string }[] } | null) => {
        setRenderJobs(data?.jobs ?? []);
      })
      .catch(() => setRenderJobs([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function backupLocalBlobs() {
    setBackupBusy(true);
    setBackupMsg(null);
    try {
      await uploadProjectsBlobs(getSyncableProjects());
      setBackupMsg("Media backup finished — cloud blob refs saved on projects.");
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function enqueueCloudRender() {
    const projectId = prompt("Project id to render in the cloud queue:");
    if (!projectId) return;
    setQueueBusy(true);
    setQueueMsg(null);
    try {
      const res = await fetch("/api/render-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, aspects: ["16:9"] }),
      });
      const data = (await res.json()) as { job?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Queue failed.");
      setQueueMsg(`Queued job ${data.job?.id ?? ""}`);
      load();
    } catch (e) {
      setQueueMsg(e instanceof Error ? e.message : "Queue failed.");
    } finally {
      setQueueBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Eyebrow>Settings</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">Cloud &amp; integrations</h1>
      <p className="mt-2 text-ink-mute">
        Phase 10: sync projects to Postgres, buy credits, connect publish targets.
      </p>

      {oauthNotice && (
        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-soft">
          OAuth result: {oauthNotice.replace(/_/g, " ")}
        </p>
      )}

      {!clerkEnabled && (
        <Card className="mt-8 p-6">
          <p className="text-sm text-ink-mute">
            Add Clerk keys to <code className="text-ink">.env.local</code> to enable cloud sync and integrations.
            The app continues to work in local-only mode without them.
          </p>
        </Card>
      )}

      {clerkEnabled && (
        <SettingsAuthGate
          signedOut={
            <Card className="mt-8 p-6">
              <p className="text-sm text-ink-mute">Sign in to enable cloud sync, credits, and OAuth connections.</p>
              <SettingsSignInButton>
                <Button className="mt-4">Sign in</Button>
              </SettingsSignInButton>
            </Card>
          }
          signedIn={
            <IntegrationsPanel
              status={status}
              queueBusy={queueBusy}
              queueMsg={queueMsg}
              backupBusy={backupBusy}
              backupMsg={backupMsg}
              renderJobs={renderJobs}
              onEnqueue={() => void enqueueCloudRender()}
              onBackupBlobs={() => void backupLocalBlobs()}
            />
          }
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-mute">Loading settings…</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}

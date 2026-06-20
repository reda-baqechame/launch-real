"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useBrandKit } from "@/lib/brand-kit-store";
import { renderProductVideo, type CinematicClipInput } from "@/components/product-video";
import { buildScriptFromMoments } from "@/lib/script-build";
import { avatarKey, deliverableKey, getBlobUrl, saveBlob } from "@/lib/footage-store";
import { useFootageUrl } from "@/lib/use-footage-url";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { downloadBlob } from "@/lib/download-utils";
import { parseRecipients, personalizeScript, recipientLabel } from "@/lib/personalize";
import type { Project, VideoScript } from "@/lib/types";

const MAX_ROWS = 12;

function scriptFor(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  const kept = project.moments.filter((m) => m.keepByDefault);
  return buildScriptFromMoments(kept.length ? kept : project.moments.slice(0, 3), project.mainHook);
}

/**
 * Personalized / sales demos — paste a CSV of recipients, use {{firstName}} /
 * {{company}} tokens in the script (Editor tab), and bulk-render one tailored
 * video per recipient.
 */
export function PersonalizePanel({ project }: { project: Project }) {
  const brand = useBrandKit();
  const { url: footageUrl } = useFootageUrl(project.footage);
  const [csv, setCsv] = useState("firstName,company\nAlex,Acme\nSam,Globex");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

  const recipients = useMemo(() => parseRecipients(csv).slice(0, MAX_ROWS), [csv]);

  async function run() {
    if (!recipients.length) {
      setError("Add at least one recipient row (with a header line).");
      return;
    }
    setBusy(true);
    setError(null);
    setDoneCount(0);
    try {
      const base = scriptFor(project);
      // Resolve shared render inputs once.
      const imageUrls = project.footage?.screenshotKeys?.length
        ? await loadScreenshotUrls(project.footage.screenshotKeys)
        : [];
      const cinematicClips = (
        await Promise.all(
          (project.cinematicShots ?? []).map(async (s) => {
            const url = await getBlobUrl(s.blobKey, "seedance");
            return url
              ? ({ url, placement: s.placement, durationSec: s.durationSec, label: s.label } as CinematicClipInput)
              : null;
          }),
        )
      ).filter(Boolean) as CinematicClipInput[];
      const avatarClipUrl = project.avatar?.enabled
        ? (await getBlobUrl(avatarKey(project.id), "avatar")) ?? undefined
        : undefined;

      for (let i = 0; i < recipients.length; i++) {
        const label = recipientLabel(recipients[i], i);
        setStatus(`Rendering ${label} (${i + 1}/${recipients.length})`);
        const out = await renderProductVideo({
          footageUrl: footageUrl ?? "",
          clicks: project.footage?.clicks,
          script: personalizeScript(base, recipients[i]),
          moments: project.moments,
          brand,
          aspects: ["16:9"],
          imageUrls: imageUrls.length ? imageUrls : undefined,
          cinematicClips,
          avatarClipUrl,
          watermark: false,
          proxy: true,
        });
        if (out[0]) {
          await saveBlob(deliverableKey(project.id, `personal-${i}`), project.id, out[0].blob, "render");
          const safe = label.replace(/[^\w-]+/g, "-").toLowerCase();
          downloadBlob(out[0].blob, `launchreel-${safe}.${out[0].ext}`);
          setDoneCount(i + 1);
        }
      }
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Personalization failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-ink">Personalized demos</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Use <code className="text-ink">{"{{firstName}}"}</code> and{" "}
          <code className="text-ink">{"{{company}}"}</code> in your script (Editor tab), paste a CSV
          of recipients, and bulk-render one tailored video each (up to {MAX_ROWS}).
        </p>
      </div>
      <Card className="space-y-3 p-4">
        <label className="block text-sm font-medium text-ink">
          Recipients (CSV — first row is headers)
        </label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          spellCheck={false}
          className="h-36 w-full resize-y rounded-lg border border-line bg-base p-3 font-mono text-xs text-ink-soft outline-none focus:border-accent/60"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy} onClick={() => void run()}>
            {busy ? status || "Working…" : `Generate ${recipients.length} video${recipients.length === 1 ? "" : "s"}`}
          </Button>
          {doneCount > 0 && !busy && (
            <span className="text-xs text-good">{doneCount} video(s) generated &amp; downloaded ✓</span>
          )}
          {error && <span className="text-xs text-warn">{error}</span>}
        </div>
        <p className="text-xs text-ink-mute">Detected {recipients.length} recipient(s).</p>
      </Card>
    </div>
  );
}

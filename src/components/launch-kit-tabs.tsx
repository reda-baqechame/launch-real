"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Pill, ScoreBar, VideoSurface } from "@/components/ui";
import { CopyAsset, CopyButton } from "@/components/asset-bits";
import { ProductHuntAsset } from "@/components/ph-asset";
import { VoiceChips } from "@/components/voice-chips";
import { ProductVideoStudio } from "@/components/product-video";
import { VOICE_CHIPS } from "@/lib/mock-data";
import { useFootageUrl } from "@/lib/use-footage-url";
import { useStore } from "@/lib/store";
import { getBlobUrl, renderKey, saveRender, teaserGifKey } from "@/lib/footage-store";
import { buildScriptFromMoments } from "@/lib/script-build";
import { useProjectRenders } from "@/lib/use-project-renders";
import { useSocialClips } from "@/lib/use-social-clips";
import { PublishPanel } from "@/components/publish-panel";
import { downloadBlob } from "@/lib/download-utils";
import { findSharePoster, resolveShareVideo } from "@/lib/share-video";
import { analyticsWithViews } from "@/lib/analytics-store";
import type { ShareEventCounts } from "@/lib/share-analytics";
import { useCredits } from "@/lib/use-credits";
import { shouldWatermark } from "@/lib/watermark-policy";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { LocalizeTab } from "@/components/localize-tab";
import { CinematicPanel } from "@/components/cinematic-panel";
import { fetchRewrite } from "@/lib/ai";
import { useAiEnabled, usePublicConfig } from "@/lib/hosted-config";
import { voiceChipToMode } from "@/lib/voice-chip-map";
import type { LaunchAsset, Project, VideoScript } from "@/lib/types";

const TABS = [
  "Video",
  "Cinematic",
  "Product Hunt",
  "Social Clips",
  "Copy",
  "Landing Page",
  "Share Page",
  "Analytics",
  "Localize",
] as const;
type Tab = (typeof TABS)[number];

function copyItems(project: Project): LaunchAsset[] {
  if (project.captions) {
    return [
      { id: "x", title: "X post", body: project.captions.x },
      { id: "li", title: "LinkedIn post", body: project.captions.linkedin },
      { id: "ph", title: "PH first comment", body: project.captions.phFirstComment },
    ];
  }
  return project.assets.copy;
}

function CopyTab({ project }: { project: Project }) {
  const { attachAssets, attachCaptions } = useStore();
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiEnabled = useAiEnabled();
  const items = copyItems(project);

  function persistCopy(next: LaunchAsset[]) {
    if (project.captions) {
      const byId = Object.fromEntries(next.map((c) => [c.id, c.body ?? ""]));
      attachCaptions(project.id, {
        ...project.captions,
        x: byId.x ?? project.captions.x,
        linkedin: byId.li ?? project.captions.linkedin,
        phFirstComment: byId.ph ?? project.captions.phFirstComment,
      });
    }
    attachAssets(project.id, { copy: next });
  }

  async function applyVoice(chip: string) {
    if (!aiEnabled) {
      setError("Sign in or connect an Anthropic key on /new to rewrite copy.");
      return;
    }
    const withBody = items.filter((a) => a.body?.trim());
    if (!withBody.length) {
      setError("No copy to rewrite yet — generate your launch kit first.");
      return;
    }

    setActiveVoice(chip);
    setBusy(true);
    setError(null);
    const mode = voiceChipToMode(chip);

    try {
      const rewritten = await Promise.all(
        items.map(async (item) => {
          if (!item.body?.trim()) return item;
          const text = await fetchRewrite(item.body, mode);
          return { ...item, body: text };
        }),
      );
      persistCopy(rewritten);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Launch copy" hint="Founder-style, not AI slop. Nudge the voice below.">
      <div className="mb-4">
        <VoiceChips
          options={VOICE_CHIPS}
          active={activeVoice}
          onSelect={(chip) => void applyVoice(chip)}
          disabled={!aiEnabled || !items.some((a) => a.body?.trim())}
          busy={busy}
        />
        {!aiEnabled && (
          <p className="mt-2 text-xs text-ink-mute">
            Sign in or connect Claude on <Link href="/new" className="text-accent-ink hover:text-accent-soft">/new</Link> to use voice chips.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      </div>
      <div className="grid gap-2">
        {items.map((a) => (
          <CopyAsset
            key={`${a.id}:${a.body ?? ""}`}
            asset={a}
            onUpdate={(text) => {
              persistCopy(items.map((c) => (c.id === a.id ? { ...c, body: text } : c)));
            }}
          />
        ))}
      </div>
    </Section>
  );
}

export function LaunchKitTabs({ project }: { project: Project }) {
  const [tab, setTab] = useState<Tab>("Video");
  const assets = project.assets;
  const [serverCounts, setServerCounts] = useState<ShareEventCounts | null>(null);

  useEffect(() => {
    void fetch(`/api/share/${project.id}/views`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { counts?: ShareEventCounts | null } | null) => {
        if (data?.counts) setServerCounts(data.counts);
      })
      .catch(() => setServerCounts(null));
  }, [project.id]);

  const analytics = analyticsWithViews(project, serverCounts);

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="flex w-max gap-1 rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm transition-colors",
                tab === t
                  ? "bg-elevated text-ink"
                  : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "Video" && <VideoTab project={project} />}

        {tab === "Cinematic" && <CinematicPanel project={project} />}

        {tab === "Product Hunt" && (
          <Section title="Product Hunt kit" hint="Gallery, poster, screenshots, and copy — ordered for clarity.">
            <div className="grid gap-2 sm:grid-cols-2">
              {assets.productHunt.map((a) => (
                <ProductHuntAsset key={a.id} asset={a} />
              ))}
            </div>
            <PublishPanel
              projectId={project.id}
              productName={project.name}
              tagline={project.oneLiner}
            />
          </Section>
        )}

        {tab === "Social Clips" && <SocialClipsTab assets={assets.social} />}

        {tab === "Copy" && <CopyTab project={project} />}

        {tab === "Landing Page" && (
          <Section title="Landing page kit" hint="Many founders have unclear landing pages. Here's a sharper one.">
            <div className="grid gap-2">
              {assets.landingPage.map((a) => (
                <CopyAsset key={a.id} asset={a} />
              ))}
            </div>
          </Section>
        )}

        {tab === "Share Page" && <SharePageTab project={project} />}

        {tab === "Analytics" && (
          <Section title="Performance" hint="Without analytics, this is a generator. With it, it's a launch OS.">
            <div className="grid gap-3 sm:grid-cols-3">
              {analytics.metrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs text-ink-mute">{m.label}</p>
                  <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-good/20 bg-good/[0.06] p-4">
                <p className="text-xs text-ink-mute">Best-performing asset</p>
                <p className="mt-1 font-medium text-good">{analytics.bestAsset}</p>
              </div>
              <div className="rounded-xl border border-warn/20 bg-warn/[0.06] p-4">
                <p className="text-xs text-ink-mute">Weakest asset</p>
                <p className="mt-1 font-medium text-warn">{analytics.weakestAsset}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-line bg-surface p-5">
              <p className="text-sm font-medium uppercase tracking-wider text-ink-mute">
                Recommendations
              </p>
              <ul className="mt-3 space-y-2">
                {analytics.recommendations.map((r) => (
                  <li key={r} className="flex gap-3 text-sm text-ink-soft">
                    <span className="text-accent-ink">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {tab === "Localize" && <LocalizeTab project={project} />}
      </div>
    </div>
  );
}

function SocialClipsTab({ assets }: { assets: LaunchAsset[] }) {
  const { clips, loading } = useSocialClips(assets);
  const placeholders = ["Problem hook", "Product magic", "CTA"];
  const platforms = ["X / LinkedIn", "TikTok / Reels", "Follow-up post"];

  return (
    <Section
      title="3 short clips from your strongest moments"
      hint="Each clip works muted — hook card, moment cut, CTA end card."
    >
      {loading && (
        <p className="text-sm text-ink-mute">Loading social clips…</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {(clips.length ? clips : placeholders.map((label, i) => ({
          asset: { id: `ph-${i}`, title: label, meta: platforms[i] } as LaunchAsset,
          url: "",
        }))).map(({ asset, url }, i) => (
          <div key={asset.id} className="rounded-xl border border-line bg-surface p-3">
            {url ? (
              <video
                src={url}
                controls
                playsInline
                muted
                className="mx-auto aspect-[9/16] max-h-72 w-full rounded-lg border border-line bg-black object-contain"
              />
            ) : (
              <VideoSurface label={asset.title} ratio="9 / 16" />
            )}
            <p className="mt-3 text-sm font-medium text-ink">{asset.title}</p>
            <p className="text-xs text-ink-mute">
              Best for: {asset.meta ?? platforms[i]}
            </p>
            {asset.body && !asset.blobKey && (
              <p className="mt-2 text-xs text-ink-soft line-clamp-3">{asset.body}</p>
            )}
            {asset.body && asset.blobKey && (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-base p-2 text-xs text-ink-soft">
                {asset.body}
              </pre>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {asset.body && <CopyButton text={asset.body} />}
              {url && (
                <button
                  onClick={() => {
                    void fetch(url)
                      .then((r) => r.blob())
                      .then((blob) =>
                        downloadBlob(blob, `launchreel-${asset.id}.webm`),
                      );
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-line-strong hover:text-ink"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!loading && clips.length === 0 && (
        <p className="mt-4 text-sm text-ink-mute">
          Generate your launch kit from the Moments step to render social clips.
        </p>
      )}
    </Section>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function defaultScript(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  if (project.script) {
    const kept = project.moments.filter((m) => m.keepByDefault);
    return { ...project.script, shotList: kept.map((m) => ({
      momentId: m.id,
      durationSec: Math.max(2.5, (m.endSec ?? (m.startSec ?? 0) + 4) - (m.startSec ?? 0)),
    })) };
  }
  const kept = project.moments.filter((m) => m.keepByDefault).slice(0, 5);
  return buildScriptFromMoments(kept.length ? kept : project.moments.slice(0, 3), project.mainHook);
}

function VideoTab({ project }: { project: Project }) {
  const { attachRenders } = useStore();
  const credits = useCredits();
  const publicConfig = usePublicConfig();
  const applyWatermark = publicConfig?.localFree ? false : shouldWatermark(credits);
  const { url: footageUrl, loading } = useFootageUrl(project.footage);
  const { items: renderItems, loading: rendersLoading } = useProjectRenders(project.renders);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [abUrls, setAbUrls] = useState<{ variant: number; hook: string; url: string }[]>([]);
  const [teaserUrl, setTeaserUrl] = useState<string | null>(null);
  const [variantCuts, setVariantCuts] = useState<{ id: string; title: string; url: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const revoked: string[] = [];
    const items = project.assets.videos.filter(
      (v) => (v.id === "v5" || v.id === "v6") && v.blobKey,
    );
    void (async () => {
      if (!items.length) {
        if (!cancelled) setVariantCuts([]);
        return;
      }
      const rows = await Promise.all(
        items.map(async (v) => {
          const url = await getBlobUrl(v.blobKey!, "render");
          return url ? { id: v.id, title: v.title, url } : null;
        }),
      );
      if (cancelled) {
        rows.forEach((r) => r && URL.revokeObjectURL(r.url));
        return;
      }
      const valid = rows.filter(Boolean) as { id: string; title: string; url: string }[];
      revoked.push(...valid.map((v) => v.url));
      setVariantCuts(valid);
    })();
    return () => {
      cancelled = true;
      revoked.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [project.assets.videos, project.id]);

  useEffect(() => {
    const gifKey =
      project.assets.videos.find((v) => v.id === "v4")?.blobKey ?? teaserGifKey(project.id);
    let revoked: string | null = null;
    void getBlobUrl(gifKey, "render").then((url) => {
      if (url) {
        revoked = url;
        setTeaserUrl(url);
      }
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [project.assets.videos, project.id]);
  const script = defaultScript(project);
  const judge = project.judge;
  const hero =
    renderItems.find((r) => r.aspect === "16:9") ?? renderItems[0];

  useEffect(() => {
    if (!project.footage?.screenshotKeys?.length) return;
    void loadScreenshotUrls(project.footage.screenshotKeys).then(setImageUrls);
  }, [project.footage?.screenshotKeys]);

  useEffect(() => {
    if (!project.abPreviews?.length) return;
    let cancelled = false;
    const urls: string[] = [];
    void Promise.all(
      project.abPreviews.map(async (p) => {
        const url = await getBlobUrl(p.blobKey, "render");
        return url ? { variant: p.variant, hook: p.hook, url } : null;
      }),
    ).then((items) => {
      if (cancelled) {
        items.forEach((i) => i && URL.revokeObjectURL(i.url));
        return;
      }
      const valid = items.filter(Boolean) as { variant: number; hook: string; url: string }[];
      urls.push(...valid.map((v) => v.url));
      setAbUrls(valid);
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [project.abPreviews]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        {abUrls.length > 0 && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">A/B hook previews</p>
            <p className="mt-1 text-xs text-ink-mute">
              Variant {judge?.winner ?? 1} won the quality judge and was used for the full render.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {abUrls.map((p) => (
                <div key={p.variant} className="rounded-lg border border-line bg-base p-2">
                  <p className="text-xs font-medium text-ink">
                    Variant {p.variant}
                    {judge?.winner === p.variant ? " · winner" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-mute line-clamp-2">&ldquo;{p.hook}&rdquo;</p>
                  <video src={p.url} controls muted className="mt-2 aspect-video w-full rounded border border-line bg-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {hero && !rendersLoading && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">Your launch video</p>
            <video
              src={hero.url}
              controls
              className="mt-3 aspect-video w-full rounded-lg border border-line bg-black"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {renderItems.map((r) => (
                <button
                  key={r.blobKey}
                  onClick={() => {
                    void fetch(r.url)
                      .then((res) => res.blob())
                      .then((blob) =>
                        downloadBlob(blob, `launchreel-${r.aspect.replace(":", "x")}.webm`),
                      );
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-line-strong hover:text-ink"
                >
                  Download {r.aspect}
                </button>
              ))}
            </div>
          </div>
        )}

        {variantCuts.length > 0 && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">Audience cuts</p>
            <p className="mt-1 text-xs text-ink-mute">Founder vs investor hook variants — same footage, different opening.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {variantCuts.map((v) => (
                <div key={v.id} className="rounded-lg border border-line bg-base p-2">
                  <p className="text-xs font-medium text-ink">{v.title}</p>
                  <video src={v.url} controls muted className="mt-2 aspect-video w-full rounded border border-line bg-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {teaserUrl && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">5-second teaser GIF</p>
            <p className="mt-1 text-xs text-ink-mute">Muted autoplay — embed in emails, README, or PH gallery.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teaserUrl}
              alt="Launch teaser GIF"
              className="mt-3 max-h-64 w-full rounded-lg border border-line object-contain bg-base"
            />
            <button
              onClick={() => {
                void fetch(teaserUrl)
                  .then((r) => r.blob())
                  .then((blob) => downloadBlob(blob, "launchreel-teaser.gif"));
              }}
              className="mt-3 rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-line-strong hover:text-ink"
            >
              Download GIF
            </button>
          </div>
        )}

        {loading && (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-line bg-surface">
            <span className="text-sm text-ink-mute">Loading footage…</span>
          </div>
        )}
        {!loading && footageUrl ? (
          <>
            <p className="mb-3 text-sm font-medium text-ink">
              {hero ? "Re-render or try a preview cut" : "Render your video"}
            </p>
            <ProductVideoStudio
            footageUrl={footageUrl}
            clicks={project.footage?.clicks}
            script={script}
            moments={project.moments}
            imageUrls={imageUrls.length ? imageUrls : undefined}
            watermark={applyWatermark}
            onComplete={(results) => {
              void (async () => {
                const renders = await Promise.all(
                  results.map(async (r) => {
                    const key = renderKey(project.id, r.aspect);
                    await saveRender(project.id, r.aspect, r.blob);
                    return { aspect: r.aspect, blobKey: key, createdAt: new Date().toISOString() };
                  }),
                );
                attachRenders(project.id, renders);
              })();
            }}
          />
          </>
        ) : !loading ? (
          <>
            <VideoSurface label="Hero launch video" />
            <p className="mt-4 text-sm text-ink-mute">
              No footage yet.{" "}
              <Link href="/record" className="text-accent-ink hover:text-accent-soft">
                Record a demo
              </Link>{" "}
              or paste a URL on{" "}
              <Link href="/new" className="text-accent-ink hover:text-accent-soft">
                /new
              </Link>
              .
            </p>
          </>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>16:9 · Product Hunt / YouTube</Pill>
          <Pill>9:16 · TikTok / Reels</Pill>
          <Pill>1:1 · LinkedIn / X</Pill>
        </div>
        <p className="mt-4 text-xs text-ink-mute">
          {applyWatermark ?
            "Free videos include a LaunchReel end card. Upgrade to remove it."
          : "Watermark removed — you have cloud credits."}
        </p>
      </div>

      <aside className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Quality judge</p>
        <p className="mt-1 text-xs text-ink-mute">
          Every video is scored before you see it.
        </p>
        <div className="mt-4 space-y-2.5">
          <ScoreBar label="Hook clarity" value={judge?.hook ?? 88} />
          <ScoreBar label="Visual legibility" value={judge?.clarity ?? 94} />
          <ScoreBar label="Caption read" value={judge?.artifacts ?? 96} />
          <ScoreBar label="Story flow" value={judge?.pacing ?? 86} />
          <ScoreBar label="CTA strength" value={judge?.total ?? 80} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-good/20 bg-good/[0.06] px-3 py-2">
          <span className="text-xs text-ink-mute">Slop risk</span>
          <span className={cn("font-mono text-sm", judge?.pass === false ? "text-warn" : "text-good")}>
            {judge ? `${judge.total} · ${judge.pass ? "pass" : "review"}` : "9 · pass"}
          </span>
        </div>
        {judge?.winningHook && (
          <p className="mt-3 text-xs text-ink-mute">
            Winning hook (variant {judge.winner ?? 1}):{" "}
            <span className="text-ink-soft">&ldquo;{judge.winningHook}&rdquo;</span>
          </p>
        )}
        {judge?.notes && (
          <ul className="mt-4 space-y-1.5 text-xs text-ink-mute">
            {judge.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function SharePageTab({ project }: { project: Project }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    void (async () => {
      const poster = findSharePoster(project);
      if (poster) setPosterUrl(poster);
      const media = await resolveShareVideo(project);
      if (media) {
        if (media.url.startsWith("blob:")) revoked = media.url;
        setVideoUrl(media.url);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [project]);

  return (
    <Section title="Public share page" hint="Every kit is public by design. Every customer becomes distribution.">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-line bg-surface p-5">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              muted
              playsInline
              poster={posterUrl ?? undefined}
              className="aspect-video w-full rounded-lg border border-line bg-black"
            />
          ) : posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="aspect-video w-full rounded-lg border border-line object-cover"
            />
          ) : (
            <VideoSurface label={`${project.name} — share page`} />
          )}
          <h3 className="mt-4 text-lg font-medium text-ink">{project.name}</h3>
          <p className="text-sm text-ink-mute">{project.oneLiner}</p>
        </div>
        <div className="flex flex-col gap-2">
          <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${project.id}`} />
          <a
            href={`/share/${project.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-2 text-center text-xs text-accent-ink transition-colors hover:bg-accent/15"
          >
            Open public page ↗
          </a>
        </div>
      </div>
    </Section>
  );
}

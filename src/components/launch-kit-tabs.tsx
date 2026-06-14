"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button, Pill, ScoreBar, VideoSurface } from "@/components/ui";
import { CopyAsset, CopyButton, MediaAsset, AssetAction } from "@/components/asset-bits";
import { VoiceChips } from "@/components/voice-chips";
import { LOCALES, VOICE_CHIPS } from "@/lib/mock-data";
import { localizeAssets, useAnthropicKey, type CopyContext, type LocalizedItem } from "@/lib/ai";
import { useBrandKit } from "@/lib/brand";
import type { Project } from "@/lib/types";

const TABS = [
  "Video",
  "Product Hunt",
  "Social Clips",
  "Copy",
  "Landing Page",
  "Share Page",
  "Analytics",
  "Localize",
] as const;
type Tab = (typeof TABS)[number];

export function LaunchKitTabs({ project }: { project: Project }) {
  const [tab, setTab] = useState<Tab>("Video");
  const { assets, analytics } = project;
  const brand = useBrandKit();
  const copyContext: CopyContext = {
    name: project.name,
    oneLiner: project.oneLiner,
    audience: project.audience,
    hook: project.mainHook,
    cta: brand.cta,
  };

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

        {tab === "Product Hunt" && (
          <Section title="Product Hunt kit" hint="Gallery, poster, screenshots, and copy — ordered for clarity.">
            <div className="grid gap-2 sm:grid-cols-2">
              {assets.productHunt.map((a) =>
                a.body ? (
                  <CopyAsset key={a.id} asset={a} context={copyContext} />
                ) : (
                  <MediaAsset key={a.id} asset={a} />
                ),
              )}
            </div>
          </Section>
        )}

        {tab === "Social Clips" && (
          <Section title="3 short clips from your strongest moments" hint="Each clip works muted and starts with the payoff.">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Problem hook", "Product magic", "CTA"].map((label, i) => (
                <div key={label} className="rounded-xl border border-line bg-surface p-3">
                  <VideoSurface label={`Clip ${i + 1} — ${label}`} ratio="9 / 16" />
                  <p className="mt-3 text-sm font-medium text-ink">Clip {i + 1} — {label}</p>
                  <p className="text-xs text-ink-mute">
                    Best for: {["X / LinkedIn", "TikTok / Reels", "Follow-up post"][i]}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <AssetAction>Download</AssetAction>
                    <AssetAction>Rewrite caption</AssetAction>
                    <AssetAction>Regenerate</AssetAction>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {tab === "Copy" && (
          <Section title="Launch copy" hint="Founder-style, not AI slop. Nudge the voice below.">
            <div className="mb-4">
              <VoiceChips options={VOICE_CHIPS} />
            </div>
            <div className="grid gap-2">
              {assets.copy.map((a) => (
                <CopyAsset key={a.id} asset={a} context={copyContext} />
              ))}
            </div>
          </Section>
        )}

        {tab === "Landing Page" && (
          <Section title="Landing page kit" hint="Many founders have unclear landing pages. Here's a sharper one.">
            <div className="grid gap-2">
              {assets.landingPage.map((a) => (
                <CopyAsset key={a.id} asset={a} context={copyContext} />
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

        {tab === "Localize" && <LocalizeTab project={project} context={copyContext} />}
      </div>
    </div>
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

function VideoTab({ project }: { project: Project }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <VideoSurface label="Hero launch video" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>16:9 · Product Hunt / YouTube</Pill>
          <Pill>9:16 · TikTok / Reels</Pill>
          <Pill>1:1 · LinkedIn / X</Pill>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["Download MP4", "Upload to YouTube unlisted", "Copy share link", "Regenerate scene", "Remove watermark", "Create French version", "Create Arabic version"].map((a) => (
            <AssetAction key={a}>{a}</AssetAction>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-mute">
          Free videos include a LaunchReel end card. Upgrade to remove it.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {project.assets.videos.map((v) => (
            <MediaAsset key={v.id} asset={v} />
          ))}
        </div>
      </div>

      {/* Quality judge — the anti-slop engine */}
      <aside className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Quality judge</p>
        <p className="mt-1 text-xs text-ink-mute">
          Every video is scored before you see it. Failing scenes regenerate
          automatically.
        </p>
        <div className="mt-4 space-y-2.5">
          <ScoreBar label="Hook clarity" value={88} />
          <ScoreBar label="Visual legibility" value={94} />
          <ScoreBar label="Caption read" value={96} />
          <ScoreBar label="Story flow" value={86} />
          <ScoreBar label="CTA strength" value={80} />
          <ScoreBar label="Pacing" value={84} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-good/20 bg-good/[0.06] px-3 py-2">
          <span className="text-xs text-ink-mute">Slop risk</span>
          <span className="font-mono text-sm text-good">9 · pass</span>
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-ink-mute">
          <li>• The hook is clear within 3 seconds.</li>
          <li>• The CTA could be more specific.</li>
          <li>• The second clip is slightly slow.</li>
        </ul>
      </aside>
    </div>
  );
}

function SharePageTab({ project }: { project: Project }) {
  return (
    <Section title="Public share page" hint="Every kit is public by design. Every customer becomes distribution.">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <VideoSurface label={`${project.name} — share page`} />
          <h3 className="mt-4 text-lg font-medium text-ink">{project.name}</h3>
          <p className="text-sm text-ink-mute">{project.oneLiner}</p>
        </div>
        <div className="flex flex-col gap-2">
          <AssetAction>Copy share link</AssetAction>
          <AssetAction>Edit CTA</AssetAction>
          <AssetAction>Add logo</AssetAction>
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

const LOCALIZE_STYLES = ["Native founder voice", "Formal business", "Punchy social", "Investor-ready"];

function LocalizeTab({
  project,
  context,
}: {
  project: Project;
  context: CopyContext;
}) {
  const aiKey = useAnthropicKey();
  const [lang, setLang] = useState(LOCALES[1]); // French by default
  const [style, setStyle] = useState(LOCALIZE_STYLES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocalizedItem[] | null>(null);

  // The launch-day essentials worth localizing first.
  const source: LocalizedItem[] = [...project.assets.social, ...project.assets.copy]
    .filter((a) => a.body)
    .slice(0, 6)
    .map((a) => ({ title: a.title, body: a.body as string }));

  async function localize() {
    setBusy(true);
    setError(null);
    try {
      const items = await localizeAssets({
        language: lang.label,
        style,
        context,
        items: source,
      });
      setResult(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Localization failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Create a localized launch kit" hint="Not literal translation. The angle, idioms, and CTA adapt to the market.">
      <p className="text-xs uppercase tracking-wider text-ink-mute">Market</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm transition-colors",
              l.code === lang.code
                ? "border-accent/50 bg-accent/10 text-ink"
                : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            {l.label}
            {l.rtl && <span className="ml-1.5 text-xs text-ink-mute">RTL</span>}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs uppercase tracking-wider text-ink-mute">Localization style</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LOCALIZE_STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              s === style
                ? "border-accent/50 bg-accent/15 text-accent-ink"
                : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={localize} disabled={!aiKey || busy}>
          {busy ? `Creating ${lang.label} version…` : `Create ${lang.label} version`}
        </Button>
        {!aiKey && (
          <span className="text-xs text-ink-mute">Connect a key on New launch to enable</span>
        )}
        {error && <span className="text-xs text-warn">{error}</span>}
      </div>

      {result && (
        <div className="mt-6 grid gap-2" dir={lang.rtl ? "rtl" : "ltr"}>
          {result.map((item, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3" dir="ltr">
                <p className="font-medium text-ink">{item.title}</p>
                <span className="text-xs text-ink-mute">{lang.label}</span>
              </div>
              <pre
                className={cn(
                  "mt-3 whitespace-pre-wrap rounded-lg border border-line bg-base p-3 font-sans text-sm leading-relaxed text-ink-soft",
                  lang.rtl && "text-right",
                )}
              >
                {item.body}
              </pre>
              <div className="mt-3" dir="ltr">
                <CopyButton text={item.body} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

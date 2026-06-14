"use client";

import { useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { LOCALES, VOICE_CHIPS } from "@/lib/mock-data";
import { useBrandKit, saveBrandKit } from "@/lib/brand";
import type { BrandKit } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function BrandPage() {
  const saved = useBrandKit();
  const [draft, setDraft] = useState<BrandKit>(saved);
  const [justSaved, setJustSaved] = useState(false);

  function set<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustSaved(false);
  }

  function save() {
    saveBrandKit(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Eyebrow>Brand Kit</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">Own a small creative studio.</h1>
      <p className="mt-2 text-ink-mute">
        Set this once and every future launch kit comes out on-brand. Saved in
        your browser.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="space-y-5 p-6">
          <Field label="Logo / wordmark" value={draft.logoText} onChange={(v) => set("logoText", v)} />
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Primary" value={draft.primaryColor} onChange={(v) => set("primaryColor", v)} />
            <ColorField label="Accent" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
            <ColorField label="Background" value={draft.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
          </div>
          <Field label="Font" value={draft.font} onChange={(v) => set("font", v)} />
          <div>
            <p className="text-sm font-medium text-ink">Default voice</p>
            <p className="mt-1 mb-2 text-xs text-ink-mute">The tone every kit starts from.</p>
            <div className="flex flex-wrap gap-2">
              {(["Founder", "Marketer", "Technical", "Investor"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => set("voice", v)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    draft.voice === v
                      ? "border-accent/50 bg-accent/15 text-accent-ink"
                      : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Field label="Default CTA" value={draft.cta} onChange={(v) => set("cta", v)} />
          <Field label="End card" value={draft.endCard} onChange={(v) => set("endCard", v)} />
          <div>
            <p className="text-sm font-medium text-ink">Default language</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => set("defaultLanguage", l.label)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    draft.defaultLanguage === l.label
                      ? "border-accent/50 bg-accent/10 text-ink"
                      : "border-line bg-surface-2 text-ink-soft hover:border-line-strong hover:text-ink",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save}>{justSaved ? "Saved ✓" : "Save brand kit"}</Button>
            <span className="text-xs text-ink-mute">Applies to all future kits.</span>
          </div>
        </Card>

        {/* End-card preview — reflects the draft live */}
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-sm font-medium text-ink">End card preview</p>
          <div
            className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-line"
            style={{ background: draft.backgroundColor }}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex size-10 items-center justify-center rounded-xl text-white"
                style={{ background: draft.accentColor }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-sm font-medium" style={{ color: draft.primaryColor }}>
                {draft.logoText || "Your brand"}
              </span>
              <span className="text-xs text-ink-mute">{draft.endCard}</span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">
            CTA: <span className="text-ink-soft">{draft.cta}</span>
          </p>
          <p className="text-xs text-ink-mute">
            Voice: <span className="text-ink-soft">{draft.voice}</span> · Watermark:{" "}
            {draft.watermark}
          </p>
        </Card>
      </div>

      <p className="mt-6 text-xs text-ink-mute">
        Tone options used elsewhere: {VOICE_CHIPS.slice(0, 4).join(" · ")}…
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-base px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent/60"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-base px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-mono text-xs text-ink-soft outline-none"
        />
      </div>
    </label>
  );
}

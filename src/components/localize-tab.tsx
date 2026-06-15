"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { fetchLocalize, getKey } from "@/lib/ai";
import { getBrandKit, saveBrandKit } from "@/lib/brand-kit-store";
import { LOCALES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

const STYLES = ["Native founder voice", "Formal business", "Punchy social", "Investor-ready"];

export function LocalizeTab({ project }: { project: Project }) {
  const { patchProject, attachCaptions } = useStore();
  const [locale, setLocale] = useState(LOCALES[1]?.code ?? "fr");
  const [style, setStyle] = useState(STYLES[0]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function localize() {
    if (!getKey()) {
      setError("Connect an Anthropic key on /new first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await fetchLocalize({
        productName: project.name,
        oneLiner: project.oneLiner,
        hook: project.script?.hook ?? project.mainHook,
        cta: project.script?.cta ?? "Try it free",
        locale: LOCALES.find((l) => l.code === locale)?.label ?? locale,
        style,
      });
      patchProject(project.id, {
        language: locale,
        mainHook: out.hook,
        oneLiner: out.oneLiner,
        script: project.script ? { ...project.script, hook: out.hook, cta: out.cta } : project.script,
      });
      attachCaptions(project.id, {
        x: out.x,
        linkedin: project.captions?.linkedin ?? "",
        phFirstComment: project.captions?.phFirstComment ?? "",
      });
      const localeLabel = LOCALES.find((l) => l.code === locale)?.label ?? locale;
      const kit = getBrandKit();
      const langs = kit.localizedLanguages.includes(localeLabel) ?
        kit.localizedLanguages
      : [...kit.localizedLanguages, localeLabel];
      saveBrandKit({ ...kit, defaultLanguage: locale, localizedLanguages: langs });
      setResult(`Localized hook: “${out.hook}”\nX post: ${out.x}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Localization failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-mute">
        Adapt hook, CTA, and X post for a market — not literal translation.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              locale === l.code ?
                "border-accent/50 bg-accent/10 text-ink"
              : "border-line bg-surface text-ink-soft hover:border-line-strong"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs uppercase tracking-wider text-ink-mute">Localization style</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              style === s ? "border-accent/50 bg-accent/10 text-ink" : "border-line text-ink-soft"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <Button onClick={() => void localize()} disabled={busy} className="mt-5">
        {busy ? "Localizing…" : "Generate localized copy"}
      </Button>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      {result && (
        <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft">
          {result}
        </pre>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PhDraftPrefill } from "@/lib/ph-intake";

type PhDraftResponse = PhDraftPrefill & { warning?: string };

export function PhDraftIntake({
  onPrefill,
}: {
  onPrefill: (data: PhDraftPrefill) => void;
}) {
  const [draftUrl, setDraftUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function importDraft() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ph-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draftUrl }),
      });
      const data = (await res.json()) as PhDraftResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not import Product Hunt draft.");
        return;
      }
      onPrefill({
        phUrl: data.phUrl,
        productUrl: data.productUrl,
        name: data.name,
        tagline: data.tagline,
      });
      if (data.warning) setNotice(data.warning);
      else setNotice(`Imported “${data.name}” — fields prefilled below.`);
    } catch {
      setError("Import failed. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
      <label htmlFor="ph-draft-url" className="text-sm font-medium text-ink">
        Product Hunt draft URL
      </label>
      <p id="ph-draft-hint" className="mt-1 text-xs text-ink-mute">
        Paste a public Product Hunt product or post link. LaunchReel prefills your
        app URL and description — no OAuth required.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="ph-draft-url"
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="https://www.producthunt.com/products/your-product"
          aria-describedby="ph-draft-hint"
          className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={loading || !draftUrl.trim()}
          onClick={() => void importDraft()}
        >
          {loading ? "Importing…" : "Import draft"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-bad">{error}</p>
      )}
      {notice && (
        <p className="mt-2 text-xs text-good">{notice}</p>
      )}
    </div>
  );
}

/** Product Hunt draft intake — parse URLs and extract public page metadata (no OAuth). */

export interface PhDraftPrefill {
  phUrl: string;
  productUrl: string;
  name: string;
  tagline: string;
}

export function parseProductHuntUrl(raw: string):
  | { ok: true; phUrl: string; slug: string }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Paste a Product Hunt URL." };

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (!parsed.hostname.replace(/^www\./, "").endsWith("producthunt.com")) {
    return { ok: false, error: "URL must be on producthunt.com." };
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  const slug = parts.find((p) => p !== "posts" && p !== "products" && p !== "launch");
  if (!parts.length || ! slug) {
    return { ok: false, error: "Could not read a Product Hunt slug from that URL." };
  }

  const phUrl = `https://www.producthunt.com/products/${encodeURIComponent(slug)}`;
  return { ok: true, phUrl, slug };
}

export function slugToProductName(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Best-effort extraction from a fetched Product Hunt HTML page. */
export function extractPhMetaFromHtml(html: string, slug: string): Omit<PhDraftPrefill, "phUrl"> {
  const og = (prop: string) => {
    const m = html.match(
      new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    );
    if (m) return decodeHtmlEntities(m[1]);
    const m2 = html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
        "i",
      ),
    );
    return m2 ? decodeHtmlEntities(m2[1]) : undefined;
  };

  const title = og("og:title")?.replace(/\s*[|–-]\s*Product Hunt\s*$/i, "").trim();
  const tagline = og("og:description")?.trim() ?? "";
  const name = title || slugToProductName(slug);

  let productUrl = "";
  const websiteMatch = html.match(
    /data-test=["']product-website-link["'][^>]*href=["']([^"']+)["']/i,
  );
  if (websiteMatch) {
    productUrl = websiteMatch[1];
  } else {
    const visitMatch = html.match(
      /href=["'](https?:\/\/[^"']+)["'][^>]*>\s*(?:Visit|Get|Try|Website)/i,
    );
    productUrl = visitMatch?.[1] ?? "";
  }

  if (productUrl && !productUrl.startsWith("http")) {
    productUrl = "";
  }

  return {
    productUrl: productUrl || `https://www.producthunt.com/products/${encodeURIComponent(slug)}`,
    name,
    tagline,
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/api-limits";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  isNextResponse,
  jsonError,
  parseJsonBody,
  requireNonEmpty,
} from "@/lib/api-helpers";
import {
  extractPhMetaFromHtml,
  parseProductHuntUrl,
  slugToProductName,
  type PhDraftPrefill,
} from "@/lib/ph-intake";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`ph-draft:${clientIp(req)}`, 20, 60_000)) {
    return jsonError("Too many requests.", 429);
  }

  const body = await parseJsonBody<{ url?: string }>(req);
  if (isNextResponse(body)) return body;

  const rawUrl = requireNonEmpty(body.url, "url");
  if (isNextResponse(rawUrl)) return rawUrl;

  const parsed = parseProductHuntUrl(rawUrl);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  try {
    const res = await fetch(parsed.phUrl, {
      headers: {
        "User-Agent": "LaunchReel/1.0 (Product Hunt draft intake)",
        Accept: "text/html",
      },
      redirect: "manual",
      next: { revalidate: 3600 },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location && !location.includes("producthunt.com")) {
        return jsonError("Unexpected redirect from Product Hunt.", 400);
      }
    }

    if (!res.ok) {
      return NextResponse.json({
        phUrl: parsed.phUrl,
        productUrl: parsed.phUrl,
        name: slugToProductName(parsed.slug),
        tagline: "",
        warning: "Could not fetch Product Hunt page — using slug only.",
      } satisfies PhDraftPrefill & { warning?: string });
    }

    const html = (await res.text()).slice(0, LIMITS.phDraftHtmlChars);
    const meta = extractPhMetaFromHtml(html, parsed.slug);

    return NextResponse.json({
      phUrl: parsed.phUrl,
      ...meta,
    } satisfies PhDraftPrefill);
  } catch {
    return NextResponse.json({
      phUrl: parsed.phUrl,
      productUrl: parsed.phUrl,
      name: slugToProductName(parsed.slug),
      tagline: "",
      warning: "Network error — using slug only.",
    } satisfies PhDraftPrefill & { warning?: string });
  }
}

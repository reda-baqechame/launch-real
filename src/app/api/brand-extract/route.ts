import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  handleAnthropicError,
  isNextResponse,
  jsonError,
  parseJsonBody,
} from "@/lib/api-helpers";
import { resolveAnthropicKey } from "@/lib/server-keys";
import { LIMITS } from "@/lib/api-limits";
import { BRAND_SYSTEM } from "@/lib/ai-prompts";
import { validatePublicHttpsUrl } from "@/lib/url-safety-server";
import { isLocalFreeRequest, localFreeBrandExtract } from "@/lib/local-free";

export const runtime = "nodejs";

const BRAND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    primaryColor: { type: "string", description: "#RRGGBB" },
    accentColor: { type: "string", description: "#RRGGBB" },
    backgroundColor: { type: "string", description: "#RRGGBB" },
    font: { type: "string" },
    logoText: { type: "string" },
    voice: { type: "string", enum: ["Founder", "Marketer", "Technical", "Investor"] },
  },
  required: ["primaryColor", "accentColor", "backgroundColor", "font", "logoText", "voice"],
} as const;

const SUPPORTED_IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function metaContent(html: string, attr: "property" | "name", key: string): string | undefined {
  const a = html.match(
    new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
  );
  if (a) return decodeEntities(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`, "i"),
  );
  return b ? decodeEntities(b[1]) : undefined;
}

function cleanTitle(raw?: string): string | undefined {
  return raw?.replace(/\s*[|–—-]\s*[^|–—-]{0,40}$/, "").trim() || raw?.trim();
}

export async function POST(req: Request) {
  const reqBody = await parseJsonBody<{ url?: string }>(req);
  if (isNextResponse(reqBody)) return reqBody;

  if (isLocalFreeRequest(req)) {
    return NextResponse.json(localFreeBrandExtract(reqBody.url));
  }

  const key = await resolveAnthropicKey(req);
  if (isNextResponse(key)) return key;

  if (!reqBody.url?.trim()) return jsonError("No URL provided.", 400);

  let pageUrl: URL;
  try {
    pageUrl = await validatePublicHttpsUrl(reqBody.url);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Invalid URL.", 400);
  }

  // Fetch the homepage HTML (size + time capped).
  let html = "";
  try {
    const res = await fetch(pageUrl.toString(), {
      headers: { "user-agent": "LaunchReelBot/1.0 (+brand-extract)" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (res.ok) html = (await res.text()).slice(0, 600_000);
  } catch {
    // Fall through — we can still infer from the hostname.
  }

  const themeColor = metaContent(html, "name", "theme-color");
  const ogTitle =
    cleanTitle(metaContent(html, "property", "og:title")) ||
    cleanTitle(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
  const ogImage = metaContent(html, "property", "og:image");
  const hostName = pageUrl.hostname.replace(/^www\./, "");

  // Try to load the OG image for a vision-based palette.
  let imageBlock: Anthropic.ImageBlockParam | null = null;
  if (ogImage) {
    try {
      const imgUrl = await validatePublicHttpsUrl(
        ogImage.startsWith("http") ? ogImage : new URL(ogImage, pageUrl).toString(),
      );
      const imgRes = await fetch(imgUrl.toString(), {
        headers: { "user-agent": "LaunchReelBot/1.0 (+brand-extract)" },
        signal: AbortSignal.timeout(8000),
      });
      const ctype = (imgRes.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const media = SUPPORTED_IMAGE_TYPES[ctype];
      if (imgRes.ok && media) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const b64 = buf.toString("base64");
        if (b64.length > 0 && b64.length <= LIMITS.analyzeFrameBase64Chars) {
          imageBlock = {
            type: "image",
            source: { type: "base64", media_type: media, data: b64 },
          };
        }
      }
    } catch {
      // Ignore — fall back to text-only hints.
    }
  }

  const hints = [
    `Product name: ${ogTitle || hostName}.`,
    `Website: ${hostName}.`,
    themeColor ? `Declared theme-color: ${themeColor}.` : "No theme-color declared.",
    imageBlock
      ? "The attached image is the site's hero/OG image — read the palette from it."
      : "No hero image available; infer a tasteful palette from the name and theme-color.",
  ].join("\n");

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = imageBlock
    ? [{ type: "text", text: hints }, imageBlock]
    : hints;

  const client = new Anthropic({ apiKey: key });
  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system: BRAND_SYSTEM,
      output_config: { format: { type: "json_schema", schema: BRAND_SCHEMA } },
      messages: [{ role: "user", content }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("No brand kit returned.", 502);
    }
    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (err) {
    return handleAnthropicError(err, "Brand extraction failed.");
  }
}

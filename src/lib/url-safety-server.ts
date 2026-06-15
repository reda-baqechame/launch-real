import { lookup } from "dns/promises";
import { isIP } from "net";
import { sameHostname } from "@/lib/blob-hosts";

export { sameHostname };

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.google"]);

function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (kind === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
      return true;
    }
  }
  return false;
}

function allowLocalHttp(hostname: string): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1")
  );
}

/** Validate a user-supplied URL before server-side fetch or browser navigation. */
export async function validatePublicHttpsUrl(raw: string): Promise<URL> {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) {
    throw new Error("Invalid URL.");
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "https:" && !allowLocalHttp(url.hostname)) {
    throw new Error("Only HTTPS URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error("URL not allowed.");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private network URLs are not allowed.");
    return url;
  }

  const records = await lookup(host, { all: true });
  if (!records.length) throw new Error("Could not resolve URL.");
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error("URL resolves to a private network.");
    }
  }

  return url;
}

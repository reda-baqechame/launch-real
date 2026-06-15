import { isBlobStorageEnabled } from "@/lib/cloud/config";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata.google"]);

function allowLocalHttp(hostname: string): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1")
  );
}

function allowedBlobHosts(): string[] {
  const hosts = new Set<string>();
  const publicUrl = process.env.S3_PUBLIC_URL?.trim();
  if (publicUrl) {
    try {
      hosts.add(new URL(publicUrl).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (endpoint) {
    try {
      hosts.add(new URL(endpoint).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION ?? "us-east-1";
  if (bucket) {
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`.toLowerCase());
    hosts.add(`${bucket}.s3.amazonaws.com`.toLowerCase());
  }
  return [...hosts];
}

/** Only URLs on configured object storage may be fetched server-side. */
export function isAllowedBlobPublicUrl(url: string): boolean {
  if (!isBlobStorageEnabled()) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !allowLocalHttp(parsed.hostname)) return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    return allowedBlobHosts().some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function sameHostname(a: URL, b: URL): boolean {
  return a.hostname.toLowerCase() === b.hostname.toLowerCase();
}

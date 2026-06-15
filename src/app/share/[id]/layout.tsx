import type { Metadata } from "next";
import { appBaseUrl } from "@/lib/cloud/config";

type Props = { params: Promise<{ id: string }> };

async function fetchShareMeta(id: string) {
  try {
    const res = await fetch(`${appBaseUrl()}/api/share/${id}/meta`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      name: string;
      oneLiner: string;
      hook?: string;
      image?: string | null;
      video?: string | null;
      url?: string;
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = await fetchShareMeta(id);
  const title = meta?.name ? `${meta.name} — LaunchReel` : "LaunchReel share";
  const description = meta?.oneLiner ?? "Launch kit created with LaunchReel.";
  const url = meta?.url ?? `${appBaseUrl()}/share/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "LaunchReel",
      type: meta?.video ? "video.other" : "website",
      images: meta?.image ? [{ url: meta.image }] : undefined,
      videos: meta?.video ? [{ url: meta.video }] : undefined,
    },
    twitter: {
      card: meta?.image ? "summary_large_image" : "summary",
      title,
      description,
      images: meta?.image ? [meta.image] : undefined,
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Project } from "@/lib/types";

export interface PhLaunchPackage {
  submitUrl: string;
  productName: string;
  tagline: string;
  description: string;
  firstComment: string;
  galleryVideoUrl: string | null;
  posterNote: string;
  steps: string[];
  apiNote: string;
}

/**
 * Product Hunt does not expose a public API to create posts.
 * This package prepares everything for manual submission on producthunt.com/posts/new.
 */
export function buildPhLaunchPackage(
  project: Project,
  galleryVideoUrl: string | null,
): PhLaunchPackage {
  const firstComment =
    project.captions?.phFirstComment ??
    project.assets.productHunt.find((a) => a.id === "ph6" || a.title.toLowerCase().includes("first comment"))
      ?.body ??
    `Hey hunters 👋 We built ${project.name} to help founders launch faster. Happy to answer anything!`;

  const description =
    project.assets.productHunt.find((a) => a.id === "ph5" || a.title.toLowerCase().includes("description"))
      ?.body ?? project.oneLiner;

  const hasPoster = Boolean(
    project.assets.productHunt.find((a) => a.id === "ph-poster" && a.body)?.body,
  );

  return {
    submitUrl: "https://www.producthunt.com/posts/new",
    productName: project.name,
    tagline: project.oneLiner,
    description,
    firstComment,
    galleryVideoUrl,
    posterNote: hasPoster
      ? "Gallery poster is in your launch kit — upload from the Product Hunt tab or ZIP."
      : "Generate your kit to create the gallery poster PNG.",
    steps: [
      "Open Product Hunt → New post",
      "Paste tagline + description from this package",
      "Upload gallery poster (1270×760) from your kit",
      "Link gallery video URL or upload the 16:9 render",
      "Schedule launch and paste first comment after going live",
    ],
    apiNote:
      "Product Hunt does not offer a public create-post API. LaunchReel prepares assets; you submit on producthunt.com.",
  };
}

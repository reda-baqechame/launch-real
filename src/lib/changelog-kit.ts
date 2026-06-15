import type { LaunchAsset } from "./types";

/** Turn PRD/changelog paste into launch copy assets. */
export function buildChangelogAssets(raw: string, productName: string): LaunchAsset[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter((l) => l.length > 8)
    .slice(0, 8);

  if (!lines.length) {
    return [
      {
        id: "cl-summary",
        title: "Changelog launch post",
        body: `What's new in ${productName}: faster onboarding, clearer value, and a sharper launch story.`,
      },
    ];
  }

  const bullets = lines.map((l) => `• ${l}`).join("\n");
  return [
    {
      id: "cl-summary",
      title: "Changelog → launch post",
      body: `${productName} just shipped:\n\n${bullets}\n\nBuilt with LaunchReel — turn your changelog into a launch kit.`,
    },
    {
      id: "cl-email",
      title: "Changelog email",
      body: `Subject: ${productName} update — ${lines[0]}\n\nHi {{first_name}},\n\nWe shipped:\n${bullets}\n\nSee the full walkthrough on our share page.`,
    },
    {
      id: "cl-x",
      title: "Changelog X post",
      body: `Shipped in ${productName}:\n${lines.slice(0, 3).map((l) => `→ ${l}`).join("\n")}`,
    },
  ];
}

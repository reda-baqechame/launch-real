import { fetchCaptions, getKey } from "@/lib/ai";
import { fetchPublicConfig } from "@/lib/public-config-client";
import { getBlobUrl, saveBlob, socialClipKey } from "@/lib/footage-store";
import { loadScreenshotUrls } from "@/lib/screenshot-loader";
import { buildScriptFromMoments } from "@/lib/script-build";
import { renderAllSocialClips } from "@/lib/social-clip-render";
import { planSocialClips } from "@/lib/social-clips";
import type {
  DemoMoment,
  GeneratedCaptions,
  LaunchAsset,
  Project,
  VideoScript,
} from "@/lib/types";

function selectedMoments(project: Project): DemoMoment[] {
  return project.moments.filter(
    (m) => m.role !== "Remove" && m.keepByDefault !== false,
  );
}

function resolveScript(project: Project, moments: DemoMoment[]): VideoScript {
  return project.script ?? buildScriptFromMoments(moments, project.mainHook);
}

async function loadProjectMedia(project: Project) {
  const footage = project.footage;
  if (!footage?.blobKey) {
    throw new Error("No footage saved — generate from Moments first.");
  }
  const footageUrl = await getBlobUrl(footage.blobKey, "footage");
  if (!footageUrl) {
    throw new Error("Could not load saved footage.");
  }

  let imageUrls: string[] = [];
  if (footage.kind === "screenshots" && footage.screenshotKeys?.length) {
    imageUrls = await loadScreenshotUrls(footage.screenshotKeys);
  }

  return { footageUrl, imageUrls, footage };
}

/** Re-render vertical social clips only (no hero video / PH kit). */
export async function regenerateSocialClips(
  project: Project,
  watermark = true,
): Promise<LaunchAsset[]> {
  const moments = selectedMoments(project);
  if (!moments.length) {
    throw new Error("No moments selected — revisit the Moments step.");
  }

  const script = resolveScript(project, moments);
  const { footageUrl, imageUrls, footage } = await loadProjectMedia(project);
  const clipPlans = planSocialClips(moments, script.hook, script.cta);

  try {
    const clipResults = await renderAllSocialClips({
      footageUrl,
      imageUrls,
      plans: clipPlans,
      ctaText: script.cta,
      clicks: footage.clicks,
      watermark,
    });

    const socialAssets = await Promise.all(
      clipResults.map(async ({ plan, blob }) => {
        const key = socialClipKey(project.id, plan.id);
        await saveBlob(key, project.id, blob, "render");
        const existing = project.assets.social.find((a) => a.id === plan.id);
        return {
          id: plan.id,
          title: `Clip — ${plan.label}`,
          meta: `9:16 · ${plan.platform}`,
          blobKey: key,
          body: existing?.body,
        } satisfies LaunchAsset;
      }),
    );

    return socialAssets;
  } finally {
    URL.revokeObjectURL(footageUrl);
  }
}

/** Regenerate launch copy + social clip captions (no video re-render). */
export async function regenerateLaunchCopy(
  project: Project,
): Promise<{ captions: GeneratedCaptions; social: LaunchAsset[]; copy: LaunchAsset[] }> {
  const cfg = await fetchPublicConfig();
  if (!cfg.localFree && !cfg.hosted && !getKey()) {
    throw new Error("Connect an Anthropic key on /new to regenerate copy.");
  }

  const moments = selectedMoments(project);
  if (!moments.length) {
    throw new Error("No moments selected — revisit the Moments step.");
  }

  const script = resolveScript(project, moments);
  const clipPlans = planSocialClips(moments, script.hook, script.cta);
  const captions = await fetchCaptions(
    script,
    project.name,
    clipPlans.map((p) => ({ id: p.id, label: p.label, platform: p.platform })),
  );

  const captionById = new Map(
    captions.socialClips?.map((c) => [c.id, c.caption]) ?? [],
  );
  const social = project.assets.social.map((a) => ({
    ...a,
    body: captionById.get(a.id) ?? a.body,
  }));
  const copy: LaunchAsset[] = [
    { id: "x", title: "X post", body: captions.x },
    { id: "li", title: "LinkedIn post", body: captions.linkedin },
    { id: "ph", title: "PH first comment", body: captions.phFirstComment },
  ];

  return { captions, social, copy };
}

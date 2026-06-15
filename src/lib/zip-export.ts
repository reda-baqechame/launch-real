import { zipSync } from "fflate";
import { getBlob, narrationKey } from "./footage-store";
import { isImageDataUrl } from "./download-utils";
import type { Project } from "./types";

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function slugify(name: string): string {
  return name.replace(/[^\w.-]+/g, "-").toLowerCase() || "launchreel";
}

function audioExtension(blob: Blob): string {
  if (blob.type.includes("wav")) return "wav";
  if (blob.type.includes("mpeg") || blob.type.includes("mp3")) return "mp3";
  if (blob.type.includes("webm")) return "webm";
  return "audio";
}

function buildNarrationScript(project: Project): string | null {
  const script = project.script;
  if (!script?.lines.length) return null;
  return [
    `Hook: ${script.hook}`,
    "",
    ...script.lines.map(
      (line) => `[${line.startSec.toFixed(1)}s – ${line.endSec.toFixed(1)}s] ${line.text}`,
    ),
    "",
    `CTA: ${script.cta}`,
  ].join("\n");
}

/** Bundle all downloadable project assets into one ZIP. */
export async function buildProjectZip(project: Project): Promise<Blob> {
  const slug = slugify(project.name);
  const files: Record<string, Uint8Array> = {};

  if (project.renders?.length) {
    for (const r of project.renders) {
      const blob = await getBlob(r.blobKey, "render");
      if (blob) files[`videos/${ slug}-${r.aspect.replace(":", "x")}.webm`] = await blobToBytes(blob);
    }
  }

  if (project.abPreviews?.length) {
    for (const preview of project.abPreviews) {
      const blob = await getBlob(preview.blobKey, "render");
      if (blob) {
        files[`videos/${ slug}-ab-variant-${preview.variant}.webm`] = await blobToBytes(blob);
      }
    }
  }

  for (const asset of project.assets.social) {
    if (!asset.blobKey) continue;
    const blob = await getBlob(asset.blobKey, "render");
    if (blob) files[`social/${slug}-${asset.id}.webm`] = await blobToBytes(blob);
  }

  const teaserKey =
    project.assets.videos.find((v) => v.id === "v4")?.blobKey ?? `gif:${project.id}`;
  const teaserBlob = await getBlob(teaserKey, "render");
  if (teaserBlob?.type.includes("gif")) {
    files[`videos/${slug}-teaser.gif`] = await blobToBytes(teaserBlob);
  }

  for (const asset of project.assets.productHunt) {
    if (isImageDataUrl(asset.body)) {
      files[`product-hunt/${ slug}-${asset.id}.png`] = dataUrlToBytes(asset.body!);
    }
    if (asset.id === "ph-video" && asset.blobKey) {
      const already = project.renders?.some((r) => r.blobKey === asset.blobKey);
      if (!already) {
        const blob = await getBlob(asset.blobKey, "render");
        if (blob) files[`product-hunt/${ slug}-gallery-video.webm`] = await blobToBytes(blob);
      }
    }
  }

  const copyEntries =
    project.captions ?
      [
        ["x-post.txt", project.captions.x],
        ["linkedin.txt", project.captions.linkedin],
        ["ph-first-comment.txt", project.captions.phFirstComment],
        ...(project.captions.socialClips?.map((c) => [`social/${c.id}-caption.txt`, c.caption]) ?? []),
      ]
    : project.assets.copy.filter((a) => a.body).map((a) => [`copy/${a.id}.txt`, a.body!]);

  for (const [path, text] of copyEntries) {
    files[`copy/${path}`] = new TextEncoder().encode(text);
  }

  for (const asset of project.assets.social) {
    if (asset.body && !asset.blobKey) {
      files[`copy/social-${asset.id}-caption.txt`] = new TextEncoder().encode(asset.body);
    }
  }

  const narrationBlob = await getBlob(narrationKey(project.id), "narration");
  if (narrationBlob) {
    const ext = audioExtension(narrationBlob);
    files[`audio/${slug}-narration.${ext}`] = await blobToBytes(narrationBlob);
  }

  const narrationScript = buildNarrationScript(project);
  if (narrationScript) {
    files[`audio/${slug}-narration-script.txt`] = new TextEncoder().encode(narrationScript);
  }

  if (Object.keys(files).length === 0) {
    files["README.txt"] = new TextEncoder().encode(
      "No rendered assets yet. Generate your launch kit from the Moments step.",
    );
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: "application/zip" });
}

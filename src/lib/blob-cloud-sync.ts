import { patchProject } from "@/lib/store";
import { listProjectBlobs } from "@/lib/footage-store";
import type { CloudBlobRef, Project } from "@/lib/types";

async function presignUpload(input: {
  projectId: string;
  blobKey: string;
  contentType: string;
}): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string } | null> {
  const res = await fetch("/api/blobs/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  return (await res.json()) as { uploadUrl: string; objectKey: string; publicUrl: string };
}

async function uploadOne(
  projectId: string,
  blobKey: string,
  blob: Blob,
): Promise<CloudBlobRef | null> {
  const presigned = await presignUpload({
    projectId,
    blobKey,
    contentType: blob.type || "application/octet-stream",
  });
  if (!presigned) return null;

  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": blob.type || "application/octet-stream" },
  });
  if (!put.ok) return null;

  return {
    objectKey: presigned.objectKey,
    url: presigned.publicUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/** Upload all local blobs for a project that are not yet in cloudBlobs. */
export async function uploadProjectBlobs(project: Project): Promise<Record<string, CloudBlobRef>> {
  const existing = project.cloudBlobs ?? {};
  const local = await listProjectBlobs(project.id);
  const next = { ...existing };

  for (const { key, blob } of local) {
    if (next[key]) continue;
    const uploaded = await uploadOne(project.id, key, blob);
    if (uploaded) next[key] = uploaded;
  }

  return next;
}

export async function uploadProjectsBlobs(projects: Project[]): Promise<void> {
  for (const project of projects) {
    const cloudBlobs = await uploadProjectBlobs(project);
    if (Object.keys(cloudBlobs).length > Object.keys(project.cloudBlobs ?? {}).length) {
      patchProject(project.id, { cloudBlobs });
    }
  }
}

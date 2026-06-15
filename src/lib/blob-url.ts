import { objectKeyForBlob, publicUrlForObject } from "@/lib/cloud/blob-storage";
import { isAllowedBlobPublicUrl } from "@/lib/blob-hosts";
import type { CloudBlobRef } from "@/lib/types";

/** Resolve a cloud blob URL only from trusted object storage — never arbitrary client URLs. */
export function resolveTrustedBlobUrl(
  ref: CloudBlobRef | undefined,
  opts?: { clerkId?: string; projectId?: string; blobKey?: string },
): string | null {
  if (ref?.objectKey) {
    const fromKey = publicUrlForObject(ref.objectKey);
    if (isAllowedBlobPublicUrl(fromKey)) return fromKey;
  }

  if (ref?.url && isAllowedBlobPublicUrl(ref.url)) {
    return ref.url;
  }

  if (opts?.clerkId && opts.projectId && opts.blobKey) {
    const rebuilt = publicUrlForObject(
      objectKeyForBlob(opts.clerkId, opts.projectId, opts.blobKey),
    );
    if (isAllowedBlobPublicUrl(rebuilt)) return rebuilt;
  }

  return null;
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isBlobStorageEnabled } from "@/lib/cloud/config";

export { isBlobStorageEnabled };

function s3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export function objectKeyForBlob(clerkId: string, projectId: string, blobKey: string): string {
  const safe = blobKey.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return `users/${clerkId}/projects/${projectId}/${safe}`;
}

export function publicUrlForObject(objectKey: string): string {
  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (base) return `${base}/${objectKey}`;
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.AWS_REGION ?? "us-east-1";
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}/${objectKey}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
}

export async function createPresignedUpload(input: {
  clerkId: string;
  projectId: string;
  blobKey: string;
  contentType: string;
}): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string }> {
  const objectKey = objectKeyForBlob(input.clerkId, input.projectId, input.blobKey);
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: objectKey,
    ContentType: input.contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: 3600 });
  return {
    uploadUrl,
    objectKey,
    publicUrl: publicUrlForObject(objectKey),
  };
}

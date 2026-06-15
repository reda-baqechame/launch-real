export interface YouTubeUploadInput {
  accessToken: string;
  videoUrl: string;
  title: string;
  description: string;
  privacyStatus?: "public" | "unlisted" | "private";
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
}

function videoContentType(url: string): string {
  if (url.includes(".mp4")) return "video/mp4";
  if (url.includes(".mov")) return "video/quicktime";
  return "video/webm";
}

/** Resumable upload to YouTube Data API v3 from a public cloud URL. */
export async function uploadVideoToYouTube(
  input: YouTubeUploadInput,
): Promise<YouTubeUploadResult> {
  const contentType = videoContentType(input.videoUrl);

  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: input.title.slice(0, 100),
          description: input.description.slice(0, 5000),
          categoryId: "28",
        },
        status: {
          privacyStatus: input.privacyStatus ?? "unlisted",
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed (${initRes.status}): ${err.slice(0, 200)}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL.");

  const videoRes = await fetch(input.videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Could not fetch cloud video (${videoRes.status}).`);
  }

  const bytes = Buffer.from(await videoRes.arrayBuffer());

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
    },
    body: bytes,
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`YouTube upload failed (${putRes.status}): ${err.slice(0, 200)}`);
  }

  const data = (await putRes.json()) as { id?: string };
  const videoId = data.id;
  if (!videoId) throw new Error("YouTube upload succeeded but no video id returned.");

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

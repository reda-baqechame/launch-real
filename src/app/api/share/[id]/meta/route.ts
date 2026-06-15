import { NextResponse } from "next/server";
import { resolveTrustedBlobUrl } from "@/lib/blob-url";
import { withDb } from "@/lib/db/client";
import { appBaseUrl } from "@/lib/cloud/config";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

/** Public share metadata for OG tags (from synced Postgres projects). */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const project = await withDb(async (db) => {
    const res = await db.query(`SELECT data FROM projects WHERE id = $1 LIMIT 1`, [id]);
    return res.rows[0]?.data as Project | undefined;
  });

  if (!project) {
    return NextResponse.json({
      id,
      name: "LaunchReel share",
      oneLiner: "Your software is built. Now make people understand it.",
      image: null,
      video: null,
    });
  }

  const renderKey =
    project.renders?.find((r) => r.aspect === "16:9")?.blobKey ??
    project.renders?.[0]?.blobKey;
  const video = renderKey ?
    resolveTrustedBlobUrl(project.cloudBlobs?.[renderKey])
  : null;
  const poster = project.assets.productHunt.find((a) => a.id === "ph-poster")?.body;
  const image =
    (poster?.startsWith("data:") ? null : poster) ??
    (renderKey ? null : null);

  return NextResponse.json({
    id: project.id,
    name: project.name,
    oneLiner: project.oneLiner,
    hook: project.script?.hook ?? project.mainHook,
    image,
    video,
    url: `${appBaseUrl()}/share/${project.id}`,
  });
}

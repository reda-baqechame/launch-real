"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink, Pill } from "@/components/ui";
import { Logo } from "@/components/logo";
import { ShareDemoPlayer } from "@/components/share-demo-player";
import { ProjectMissing, useRouteProject } from "@/components/project-gate";
import { findSharePoster, resolveShareVideo } from "@/lib/share-video";
import {
  logShareEvent,
  trackShareEventRemote,
} from "@/lib/share-analytics";

export default function SharePage() {
  const { project, hydrated } = useRouteProject();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaKind, setMediaKind] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    logShareEvent(project.id, "view");
    void trackShareEventRemote(project.id, "view");
    let revoked: string | null = null;
    const load = async () => {
      setLoading(true);
      try {
        const poster = findSharePoster(project);
        if (poster) setPosterUrl(poster);

        const media = await resolveShareVideo(project);
        if (media) {
          if (media.url.startsWith("blob:")) revoked = media.url;
          setVideoUrl(media.url);
          setMediaKind(media.kind);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [project]);

  if (!project) return <ProjectMissing hydrated={hydrated} />;

  const hook = project.script?.hook ?? project.mainHook;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 glow-accent" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <ButtonLink href="/" variant="outline" size="sm">
          Make yours free
        </ButtonLink>
      </header>

      <main id="main-content" className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 pb-16 pt-6 text-center">
        <Pill className="mb-6">Launched with LaunchReel</Pill>
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{project.name}</h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">{project.oneLiner}</p>
        {hook && <p className="mt-2 max-w-xl text-sm text-ink-mute">{hook}</p>}

        <div className="mt-8 w-full">
          {loading ? (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-line bg-surface text-ink-mute">
              <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              muted
              playsInline
              poster={posterUrl ?? undefined}
              className="aspect-video w-full rounded-2xl border border-line bg-black"
              onPlay={() => {
                logShareEvent(project.id, "play");
                void trackShareEventRemote(project.id, "play");
              }}
            />
          ) : posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="aspect-video w-full rounded-2xl border border-line object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-ink-mute">
              <span>Launch video coming soon</span>
              <span className="text-xs">Generate your kit from the Moments step</span>
            </div>
          )}
          {mediaKind === "footage" && (
            <p className="mt-2 text-xs text-ink-mute">Raw footage preview — full render not saved in this browser.</p>
          )}
        </div>

        <div className="mt-8">
          <ButtonLink
            href={project.url}
            size="lg"
            onClick={() => {
              logShareEvent(project.id, "cta");
              void trackShareEventRemote(project.id, "cta");
            }}
          >
            Visit {project.name} →
          </ButtonLink>
        </div>

        {project.interactiveDemo?.steps?.length ? (
          <ShareDemoPlayer
            demo={project.interactiveDemo}
            productUrl={project.url}
            onCtaClick={() => {
              logShareEvent(project.id, "cta");
              void trackShareEventRemote(project.id, "cta");
            }}
          />
        ) : null}
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-8 text-center">
          <Logo />
          <p className="text-sm text-ink-mute">
            Made with LaunchReel — turn your software into a launch kit.
          </p>
          <ButtonLink href={`/?ref=${project.id}`} size="sm" className="mt-1">
            Make yours free
          </ButtonLink>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Pill, VideoSurface } from "@/components/ui";
import { Logo } from "@/components/logo";
import { getProject } from "@/lib/mock-data";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

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

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 pb-16 pt-6 text-center">
        <Pill className="mb-6">Launched with LaunchReel</Pill>
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{project.name}</h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">{project.oneLiner}</p>

        <div className="mt-8 w-full">
          <VideoSurface label={`${project.name} — product video`} />
        </div>

        <div className="mt-8">
          <ButtonLink href={project.url} size="lg">
            Visit {project.name} →
          </ButtonLink>
        </div>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-8 text-center">
          <Logo />
          <p className="text-sm text-ink-mute">
            Made with LaunchReel — turn your software into a launch kit.
          </p>
          <ButtonLink href="/" size="sm" className="mt-1">
            Make yours free
          </ButtonLink>
        </div>
      </footer>
    </div>
  );
}

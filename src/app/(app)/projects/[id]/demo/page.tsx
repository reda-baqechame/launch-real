"use client";

import { ButtonLink, Eyebrow } from "@/components/ui";
import { DemoBuilder } from "@/components/demo-builder";
import { ProjectMissing, useRouteProject } from "@/components/project-gate";
import { useBrandKit } from "@/lib/brand";

export default function DemoPage() {
  const { project, hydrated } = useRouteProject();
  const brand = useBrandKit();
  if (!project) return <ProjectMissing hydrated={hydrated} />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Interactive demo · {project.name}</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold text-ink">A clickable walkthrough.</h1>
          <p className="mt-2 text-ink-mute">
            One capture becomes every product-explanation format. This is the
            evaluation experience MP4s can&apos;t give.
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}/result`} variant="secondary" size="sm">
          Back to launch kit
        </ButtonLink>
      </div>

      <div className="mt-8">
        <DemoBuilder projectName={project.name} cta={brand.cta} endCard={brand.endCard} />
      </div>
    </div>
  );
}

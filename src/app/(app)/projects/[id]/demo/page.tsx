"use client";

import { ButtonLink, Eyebrow } from "@/components/ui";
import { DemoBuilder } from "@/components/demo-builder";
import { FlowSteps } from "@/components/flow-steps";
import { ProjectMissing, useRouteProject } from "@/components/project-gate";

export default function DemoPage() {
  const { project, hydrated } = useRouteProject();
  if (!project) return <ProjectMissing hydrated={hydrated} />;

  return (
    <div className="mx-auto max-w-5xl">
      <FlowSteps projectId={project.id} current="result" />
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Interactive demo</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold text-ink">
            Clickable walkthrough for {project.name}
          </h1>
          <p className="mt-2 text-ink-mute">
            Upload screenshots, place hotspots, and play a Supademo-style demo.
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}/result`} variant="secondary">
          ← Back to launch kit
        </ButtonLink>
      </div>
      <div className="mt-8">
        <DemoBuilder project={project} />
      </div>
    </div>
  );
}

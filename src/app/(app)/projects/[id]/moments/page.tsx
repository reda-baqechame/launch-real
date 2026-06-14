"use client";

import { Eyebrow } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { MomentReview } from "@/components/moment-review";
import { ProjectMissing, useRouteProject } from "@/components/project-gate";

export default function MomentsPage() {
  const { project, hydrated } = useRouteProject();
  if (!project) return <ProjectMissing hydrated={hydrated} />;

  return (
    <div className="mx-auto max-w-3xl">
      <FlowSteps projectId={project.id} current="moments" />
      <div className="mt-8">
        <Eyebrow>Demo Director · {project.name}</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold text-ink">
          We found the strongest moments.
        </h1>
        <p className="mt-2 text-ink-mute">
          These are the moments most likely to make a stranger understand the
          product. Keep the winners, remove the rest.
        </p>
      </div>

      <MomentReview projectId={project.id} moments={project.moments} />
    </div>
  );
}

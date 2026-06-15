"use client";

import { DownloadAllButton } from "@/components/download-all-button";
import { RegeneratePanel } from "@/components/regenerate-panel";
import { ButtonLink, Card, Eyebrow, Pill } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { LaunchKitTabs } from "@/components/launch-kit-tabs";
import { ProjectMissing, useRouteProject } from "@/components/project-gate";

export default function ResultPage() {
  const { project, hydrated } = useRouteProject();
  if (!project) return <ProjectMissing hydrated={hydrated} />;

  const angle = project.angles.find((a) => a.id === project.selectedAngleId);

  return (
    <div className="mx-auto max-w-5xl">
      <FlowSteps projectId={project.id} current="result" />

      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <Eyebrow>Your launch kit is ready</Eyebrow>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{project.name}</h1>
            <p className="mt-2 max-w-xl text-ink-soft">
              Main hook: <span className="text-accent-ink">“{project.mainHook}”</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>Score {project.score} / 100</Pill>
              {angle && <Pill>Angle: {angle.kind}</Pill>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ButtonLink href={`/projects/${project.id}/demo`} variant="secondary" size="md">
              Create interactive demo
            </ButtonLink>
            <DownloadAllButton project={project} />
            <p className="text-xs text-ink-mute">Videos, PH images, copy, social clips, and narration audio in one ZIP.</p>
          </div>
        </div>
      </Card>

      <RegeneratePanel project={project} />

      <LaunchKitTabs project={project} />
    </div>
  );
}

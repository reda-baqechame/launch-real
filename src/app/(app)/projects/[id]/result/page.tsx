import { notFound } from "next/navigation";
import { Button, Card, Eyebrow, Pill } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { LaunchKitTabs } from "@/components/launch-kit-tabs";
import { getProject } from "@/lib/mock-data";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

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
            <Button size="lg">Download all assets</Button>
            <p className="text-xs text-ink-mute">Agency deliverable, in one ZIP.</p>
          </div>
        </div>
      </Card>

      <LaunchKitTabs project={project} />
    </div>
  );
}

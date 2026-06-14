import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { AngleSelector } from "@/components/angle-selector";
import { getProject } from "@/lib/mock-data";

export default async function AnglePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <FlowSteps projectId={project.id} current="angle" />
      <div className="mt-8">
        <Eyebrow>Narrative Builder · {project.name}</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Choose your launch angle</h1>
        <p className="mt-2 text-ink-mute">
          Each angle changes the hook, audience, and emotion. This is how we avoid
          generic AI slop.
        </p>
      </div>

      <AngleSelector
        projectId={project.id}
        angles={project.angles}
        defaultSelected={project.selectedAngleId}
      />
    </div>
  );
}

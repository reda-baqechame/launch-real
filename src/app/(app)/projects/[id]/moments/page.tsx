import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { MomentReview } from "@/components/moment-review";
import { getProject } from "@/lib/mock-data";

export default async function MomentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

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

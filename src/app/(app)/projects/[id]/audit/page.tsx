import { notFound } from "next/navigation";
import { ButtonLink, Card, Eyebrow, ScoreBar, ScoreRing } from "@/components/ui";
import { FlowSteps } from "@/components/flow-steps";
import { getProject } from "@/lib/mock-data";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const { audit } = project;

  return (
    <div className="mx-auto max-w-4xl">
      <FlowSteps projectId={project.id} current="audit" />

      <div className="mt-8">
        <Eyebrow>Launch Doctor · {project.name}</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold text-ink">
          Here&apos;s the honest read on your launch.
        </h1>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Score */}
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <ScoreRing value={audit.score} />
          <p className="text-sm text-ink-mute">Launch Score</p>
        </Card>

        {/* Headline findings */}
        <Card className="divide-y divide-line">
          <Finding label="Strongest angle" value={audit.strongestAngle} accent />
          <Finding label="Weakest point" value={audit.weakestPoint} />
          <Finding label="Best audience" value={audit.bestAudience} />
          <Finding label="Best demo moment" value={audit.bestDemoMoment} />
          <Finding label="Recommended hook" value={audit.recommendedHook} accent />
        </Card>
      </div>

      {/* Breakdown */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-mute">
            Score breakdown
          </h2>
          <div className="mt-5 space-y-3">
            {audit.breakdown.map((b) => (
              <ScoreBar key={b.label} label={b.label} value={b.value} />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-mute">
            What&apos;s holding it back
          </h2>
          <ul className="mt-5 space-y-3">
            {audit.criticism.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-ink-soft">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
                  !
                </span>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink-mute">
            Other tools generate media. LaunchReel gives judgment — then fixes it.
          </p>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-mute">
          Ready when you are. Next, pick the angle that fits your launch.
        </p>
        <ButtonLink href={`/projects/${project.id}/angle`} size="lg">
          Choose your angle →
        </ButtonLink>
      </div>
    </div>
  );
}

function Finding({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs uppercase tracking-wider text-ink-mute">{label}</p>
      <p className={accent ? "mt-1 font-medium text-accent-ink" : "mt-1 text-ink-soft"}>
        {value}
      </p>
    </div>
  );
}

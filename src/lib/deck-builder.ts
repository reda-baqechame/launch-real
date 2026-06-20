import type { Project, Slide } from "./types";

/** Deterministic deck from existing project data — the keyless fallback. */
export function buildDeckFromProject(project: Project): Slide[] {
  const moments = project.moments.filter((m) => m.keepByDefault).slice(0, 4);
  const slides: Slide[] = [
    {
      kind: "title",
      title: project.name,
      bullets: [project.mainHook || project.oneLiner].filter(Boolean),
    },
    {
      kind: "point",
      title: "The problem",
      bullets: [
        project.audit?.weakestPoint || "Teams struggle to show what their software does.",
        project.audience ? `For ${project.audience}.` : "",
      ].filter(Boolean),
    },
    {
      kind: "point",
      title: "What it is",
      bullets: [project.oneLiner, project.audit?.strongestAngle].filter(Boolean) as string[],
    },
  ];

  if (moments.length) {
    slides.push({
      kind: "point",
      title: "How it works",
      bullets: moments.map((m) => m.title),
    });
  }

  slides.push({
    kind: "point",
    title: "Why it lands",
    bullets: [
      project.audit?.bestAudience || project.audience || "Built for people who ship.",
      typeof project.score === "number" ? `Launch readiness score: ${project.score}/100.` : "",
    ].filter(Boolean),
  });

  slides.push({
    kind: "cta",
    title: project.assets?.videos?.length ? "See it in action" : "Get started",
    bullets: [project.script?.cta || "Try it today."].filter(Boolean),
  });

  return slides;
}

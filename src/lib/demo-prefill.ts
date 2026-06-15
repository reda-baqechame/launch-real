import type { InteractiveDemo, InteractiveDemoStep, Project } from "./types";

export function buildDemoFromScreenshots(project: Project): InteractiveDemo | null {
  const keys = project.footage?.screenshotKeys;
  if (!keys?.length) return null;

  const steps: InteractiveDemoStep[] = keys.map((imageKey, i) => ({
    id: `step-ss-${i}`,
    imageKey,
    hotspot: { x: 0.5, y: 0.55 },
    tooltip: project.moments[i]?.title ?? `Step ${i + 1}`,
  }));

  return {
    steps,
    cta: project.script?.cta ?? "Try it free →",
  };
}

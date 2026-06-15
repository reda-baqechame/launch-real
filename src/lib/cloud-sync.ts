import type { Project } from "./types";

const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function pushProject(project: Project): Promise<boolean> {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function scheduleCloudPush(project: Project): void {
  if (typeof window === "undefined") return;
  const existing = pushTimers.get(project.id);
  if (existing) clearTimeout(existing);
  pushTimers.set(
    project.id,
    setTimeout(() => {
      pushTimers.delete(project.id);
      void pushProject(project);
    }, 1500),
  );
}

export async function syncCloudProjects(localProjects: Project[]): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects: localProjects }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { projects?: Project[] };
    return data.projects ?? [];
  } catch {
    return [];
  }
}

export async function pullCloudProjects(): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) return [];
    const data = (await res.json()) as { enabled?: boolean; projects?: Project[] };
    return data.enabled ? (data.projects ?? []) : [];
  } catch {
    return [];
  }
}

export async function deleteCloudProject(projectId: string): Promise<void> {
  try {
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
  } catch {
    /* offline */
  }
}

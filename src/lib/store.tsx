"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AiAudit, FootageMeta, GeneratedCaptions, InteractiveDemo, JudgeScores, Project, RenderOutput, VideoScript } from "./types";
import { PROJECTS } from "./mock-data";
import { buildProject, type NewProjectInput } from "./generate";

function cloudPush(project: Project) {
  if (typeof window === "undefined" || SEEDED_IDS.has(project.id)) return;
  void import("./cloud-sync").then((m) => m.scheduleCloudPush(project));
}

const STORAGE_KEY = "launchreel.projects.v1";
const SEEDED_IDS = new Set(PROJECTS.map((p) => p.id));

interface Snapshot {
  projects: Project[];
  hydrated: boolean;
}

const initialSnapshot: Snapshot = { projects: PROJECTS, hydrated: false };
let snapshot: Snapshot = initialSnapshot;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persistExtras(projects: Project[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(projects.filter((p) => !SEEDED_IDS.has(p.id))),
    );
  } catch {
    /* storage full/unavailable — keep in memory only */
  }
}

let loaded = false;
function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  let extras: Project[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) extras = (JSON.parse(raw) as Project[]).filter((p) => !SEEDED_IDS.has(p.id));
  } catch {
    /* corrupt storage — ignore */
  }
  snapshot = { projects: [...extras, ...PROJECTS], hydrated: true };
  emit();
}

function subscribe(cb: () => void): () => void {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Projects eligible for cloud sync (non-demo). */
export function getSyncableProjects(): Project[] {
  ensureLoaded();
  return snapshot.projects.filter((p) => !SEEDED_IDS.has(p.id));
}

export function patchProject(id: string, patch: Partial<Project>): Project | undefined {
  const idx = snapshot.projects.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const updated = { ...snapshot.projects[idx], ...patch, updatedAt: "Just now" };
  const next = [...snapshot.projects];
  next[idx] = updated;
  snapshot = { projects: next, hydrated: true };
  persistExtras(next);
  emit();
  cloudPush(updated);
  return updated;
}

function create(input: NewProjectInput, ai?: AiAudit): Project {
  const project = buildProject(input, ai);
  const next = [project, ...snapshot.projects.filter((p) => p.id !== project.id)];
  snapshot = { projects: next, hydrated: true };
  persistExtras(next);
  emit();
  cloudPush(project);
  return project;
}

function attachFootage(projectId: string, meta: FootageMeta): Project | undefined {
  return patchProject(projectId, { footage: meta });
}

function attachRenders(projectId: string, renders: RenderOutput[]): Project | undefined {
  return patchProject(projectId, { renders });
}

function attachScript(projectId: string, script: VideoScript): Project | undefined {
  return patchProject(projectId, { script });
}

function attachMoments(projectId: string, moments: Project["moments"]): Project | undefined {
  return patchProject(projectId, { moments });
}

function attachJudge(projectId: string, judge: JudgeScores): Project | undefined {
  return patchProject(projectId, { judge });
}

function attachCaptions(projectId: string, captions: GeneratedCaptions): Project | undefined {
  return patchProject(projectId, { captions });
}

function attachInteractiveDemo(projectId: string, interactiveDemo: InteractiveDemo): Project | undefined {
  return patchProject(projectId, { interactiveDemo });
}

function mergeAssets(
  base: Project["assets"],
  patch: Partial<Project["assets"]>,
): Project["assets"] {
  return {
    productHunt: patch.productHunt ?? base.productHunt,
    social: patch.social ?? base.social,
    copy: patch.copy ?? base.copy,
    landingPage: patch.landingPage ?? base.landingPage,
    videos: patch.videos ?? base.videos,
  };
}

function deleteProject(projectId: string): boolean {
  if (SEEDED_IDS.has(projectId)) return false;
  const idx = snapshot.projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return false;
  const next = snapshot.projects.filter((p) => p.id !== projectId);
  snapshot = { projects: next, hydrated: true };
  persistExtras(next);
  emit();
  if (!SEEDED_IDS.has(projectId)) {
    void import("./cloud-sync").then((m) => m.deleteCloudProject(projectId));
  }
  return true;
}

export function isSeededProject(projectId: string): boolean {
  return SEEDED_IDS.has(projectId);
}

export function mergeCloudProjects(cloudProjects: Project[]): void {
  ensureLoaded();
  if (!cloudProjects.length) return;

  const localExtras = snapshot.projects.filter((p) => !SEEDED_IDS.has(p.id));
  const byId = new Map(localExtras.map((p) => [p.id, p]));

  for (const cp of cloudProjects) {
    if (SEEDED_IDS.has(cp.id)) continue;
    byId.set(cp.id, cp);
  }

  const merged = [...byId.values()];
  snapshot = { projects: [...merged, ...PROJECTS], hydrated: true };
  persistExtras(merged);
  emit();
}

function attachAssets(
  projectId: string,
  assets: Partial<Project["assets"]>,
): Project | undefined {
  const project = snapshot.projects.find((p) => p.id === projectId);
  if (!project) return undefined;
  return patchProject(projectId, { assets: mergeAssets(project.assets, assets) });
}

export interface StoreValue {
  projects: Project[];
  hydrated: boolean;
  getProject: (id: string) => Project | undefined;
  createProject: (input: NewProjectInput, ai?: AiAudit) => Project;
  attachFootage: (projectId: string, meta: FootageMeta) => Project | undefined;
  attachRenders: (projectId: string, renders: RenderOutput[]) => Project | undefined;
  attachScript: (projectId: string, script: VideoScript) => Project | undefined;
  attachMoments: (projectId: string, moments: Project["moments"]) => Project | undefined;
  attachJudge: (projectId: string, judge: JudgeScores) => Project | undefined;
  attachCaptions: (projectId: string, captions: GeneratedCaptions) => Project | undefined;
  attachInteractiveDemo: (projectId: string, demo: InteractiveDemo) => Project | undefined;
  attachAssets: (projectId: string, assets: Partial<Project["assets"]>) => Project | undefined;
  deleteProject: (projectId: string) => boolean;
  patchProject: (id: string, patch: Partial<Project>) => Project | undefined;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useStore(): StoreValue {
  const snap = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initialSnapshot,
  );
  const getProject = useCallback(
    (id: string) => snap.projects.find((p) => p.id === id),
    [snap.projects],
  );
  return useMemo(
    () => ({
      projects: snap.projects,
      hydrated: snap.hydrated,
      getProject,
      createProject: create,
      attachFootage,
      attachRenders,
      attachScript,
      attachMoments,
      attachJudge,
      attachCaptions,
      attachInteractiveDemo,
      attachAssets,
      deleteProject,
      patchProject: patchProject,
    }),
    [snap.projects, snap.hydrated, getProject],
  );
}

"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AiAudit, Project } from "./types";
import { PROJECTS } from "./mock-data";
import { buildProject, type NewProjectInput } from "./generate";

const STORAGE_KEY = "launchreel.projects.v1";
const SEEDED_IDS = new Set(PROJECTS.map((p) => p.id));

interface Snapshot {
  projects: Project[];
  hydrated: boolean;
}

// A tiny module-level external store. Using useSyncExternalStore (rather than
// useState + useEffect) is the recommended way to read client-only state like
// localStorage without tearing or hydration mismatches.
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

function create(input: NewProjectInput, ai?: AiAudit): Project {
  const project = buildProject(input, ai);
  const next = [project, ...snapshot.projects.filter((p) => p.id !== project.id)];
  snapshot = { projects: next, hydrated: true };
  persistExtras(next);
  emit();
  return project;
}

export interface StoreValue {
  projects: Project[];
  hydrated: boolean;
  getProject: (id: string) => Project | undefined;
  createProject: (input: NewProjectInput, ai?: AiAudit) => Project;
}

/** Optional provider — kept so the app can mount/seed once near the root. */
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
    }),
    [snap.projects, snap.hydrated, getProject],
  );
}

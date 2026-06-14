"use client";

import { useParams } from "next/navigation";
import { ButtonLink, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

/** Resolves the `[id]` route param against the store. */
export function useRouteProject(): {
  project: Project | undefined;
  hydrated: boolean;
  id: string;
} {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { getProject, hydrated } = useStore();
  return { project: getProject(id), hydrated, id };
}

export function ProjectMissing({ hydrated }: { hydrated: boolean }) {
  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
        <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      </div>
    );
  }
  return (
    <Card className="mx-auto mt-12 max-w-md p-8 text-center">
      <h1 className="text-lg font-medium text-ink">We couldn&apos;t find that launch.</h1>
      <p className="mt-2 text-sm text-ink-mute">
        It may have been created in another browser, or the link is wrong.
      </p>
      <ButtonLink href="/dashboard" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { buildScriptFromMoments } from "@/lib/script-build";
import type { DemoMoment, Project, VideoScript } from "@/lib/types";

interface Scene {
  momentId: string;
  durationSec: number;
  caption: string;
}

const INTRO_SEC = 2;

function workingScript(project: Project): VideoScript {
  if (project.script?.shotList?.length) return project.script;
  const kept = project.moments.filter((m) => m.keepByDefault);
  const base = kept.length ? kept : project.moments.slice(0, 3);
  return buildScriptFromMoments(base, project.mainHook);
}

function scenesFromScript(script: VideoScript): Scene[] {
  const shots = script.shotList ?? [];
  return shots.map((s, i) => ({
    momentId: s.momentId,
    durationSec: Math.round((s.durationSec || 4) * 10) / 10,
    caption: script.lines[i]?.text ?? "",
  }));
}

/**
 * Timeline editor — turns the auto-generated cut into an editable scene list.
 * Edits persist to project.script; the Video tab render consumes them directly.
 */
export function TimelineEditor({ project }: { project: Project }) {
  const { patchProject } = useStore();
  const baseScript = useMemo(() => workingScript(project), [project]);
  const [scenes, setScenes] = useState<Scene[]>(() => scenesFromScript(baseScript));
  const [hook, setHook] = useState(baseScript.hook);
  const [cta, setCta] = useState(baseScript.cta);
  const [saved, setSaved] = useState(false);

  const momentTitle = (id: string): string =>
    project.moments.find((m) => m.id === id)?.title ?? id;

  const unusedMoments: DemoMoment[] = project.moments.filter(
    (m) => !scenes.some((s) => s.momentId === m.id),
  );

  const totalSec = INTRO_SEC + scenes.reduce((a, s) => a + s.durationSec, 0) + 3;

  function update(next: Scene[]) {
    setScenes(next);
    setSaved(false);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= scenes.length) return;
    const next = [...scenes];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }

  function setDuration(i: number, v: number) {
    const next = [...scenes];
    next[i] = { ...next[i], durationSec: Math.max(1, Math.min(15, v)) };
    update(next);
  }

  function setCaption(i: number, v: string) {
    const next = [...scenes];
    next[i] = { ...next[i], caption: v };
    update(next);
  }

  function remove(i: number) {
    update(scenes.filter((_, idx) => idx !== i));
  }

  function add(momentId: string) {
    if (!momentId) return;
    const m = project.moments.find((x) => x.id === momentId);
    update([
      ...scenes,
      { momentId, durationSec: 4, caption: m?.why ?? m?.title ?? "" },
    ]);
  }

  function save() {
    let t = INTRO_SEC;
    const shotList = scenes.map((s) => ({ momentId: s.momentId, durationSec: s.durationSec }));
    const lines = scenes.map((s) => {
      const startSec = t;
      t += s.durationSec;
      return { text: s.caption, startSec, endSec: t };
    });
    patchProject(project.id, {
      script: { ...baseScript, hook, cta, shotList, lines },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-ink">Timeline editor</h3>
        <p className="mt-1 text-sm text-ink-mute">
          Re-order, trim, and rewrite each scene. Saved edits apply when you render in the
          Video tab. Estimated length: ~{Math.round(totalSec)}s.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Opening hook</span>
          <input
            value={hook}
            onChange={(e) => {
              setHook(e.target.value);
              setSaved(false);
            }}
            className="mt-1.5 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Closing CTA</span>
          <input
            value={cta}
            onChange={(e) => {
              setCta(e.target.value);
              setSaved(false);
            }}
            className="mt-1.5 w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
        </label>
      </Card>

      <div className="space-y-3">
        {scenes.map((s, i) => (
          <Card key={`${s.momentId}-${i}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-ink-mute">Scene {i + 1}</p>
                <p className="truncate text-sm font-medium text-ink">{momentTitle(s.momentId)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft disabled:opacity-40 hover:text-ink"
                  type="button"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === scenes.length - 1}
                  className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft disabled:opacity-40 hover:text-ink"
                  type="button"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(i)}
                  className="rounded-md border border-line px-2 py-1 text-xs text-warn hover:border-warn/60"
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-ink-mute">
                Duration
                <input
                  type="number"
                  min={1}
                  max={15}
                  step={0.5}
                  value={s.durationSec}
                  onChange={(e) => setDuration(i, Number(e.target.value))}
                  className="w-20 rounded-md border border-line bg-base px-2 py-1 text-sm text-ink"
                />
                s
              </label>
            </div>

            <textarea
              value={s.caption}
              onChange={(e) => setCaption(i, e.target.value)}
              placeholder="Caption / voiceover line for this scene…"
              className="mt-3 h-16 w-full resize-none rounded-lg border border-line bg-base p-2.5 text-sm text-ink-soft outline-none focus:border-accent/60"
            />
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {unusedMoments.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              add(e.target.value);
              e.currentTarget.value = "";
            }}
            className="rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink-soft"
            aria-label="Add a scene"
          >
            <option value="" disabled>
              + Add scene…
            </option>
            {unusedMoments.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        <Button onClick={save} disabled={scenes.length === 0}>
          {saved ? "Saved ✓" : "Save edits"}
        </Button>
        <span className="text-xs text-ink-mute">Then render in the Video tab.</span>
      </div>
    </div>
  );
}

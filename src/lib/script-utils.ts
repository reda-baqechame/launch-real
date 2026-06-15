import type { ScriptResponse } from "./ai";
import type { VideoScript } from "./types";

export function mapScriptResponse(res: ScriptResponse): VideoScript {
  return {
    hook: res.hook,
    cta: res.cta,
    lines: res.lines,
    shotList: res.shot_list,
  };
}

export function scriptSummary(script: VideoScript): string {
  return `Hook: ${script.hook}. Lines: ${script.lines.map((l) => l.text).join(" ")}`;
}

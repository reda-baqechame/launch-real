import type { VideoScript } from "./types";

export type Recipient = Record<string, string>;

/** Parse a CSV (first row = headers) into recipient rows. */
export function parseRecipients(csv: string): Recipient[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Recipient = {};
    headers.forEach((h, i) => {
      if (h) row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/** Replace {{key}} tokens (case-insensitive) with recipient values. */
export function substituteVars(text: string, vars: Recipient): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key: string) => {
    const found = Object.keys(vars).find((k) => k.toLowerCase() === key.toLowerCase());
    return found ? vars[found] : `{{${key}}}`;
  });
}

/** Apply recipient variables across a script's hook, CTA, and lines. */
export function personalizeScript(script: VideoScript, vars: Recipient): VideoScript {
  return {
    ...script,
    hook: substituteVars(script.hook, vars),
    cta: substituteVars(script.cta, vars),
    lines: script.lines.map((l) => ({ ...l, text: substituteVars(l.text, vars) })),
  };
}

/** A short label for a recipient (firstName/company/first column). */
export function recipientLabel(vars: Recipient, index: number): string {
  return (
    vars.firstName ||
    vars.FirstName ||
    vars.name ||
    vars.company ||
    Object.values(vars)[0] ||
    `recipient-${index + 1}`
  );
}

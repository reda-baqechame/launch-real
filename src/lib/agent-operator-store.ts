import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export type OperatorJobStatus =
  | "queued"
  | "running"
  | "needs_approval"
  | "succeeded"
  | "failed"
  | "canceled";

export interface OperatorActionEntry {
  step: number;
  action: string;
  selector?: string;
  url?: string;
  reason: string;
  observation?: string;
  confidence?: number;
  status: "planned" | "done" | "blocked" | "failed";
  tMs: number;
}

export interface OperatorApprovalRequest {
  id: string;
  step: number;
  risk: string;
  reason: string;
  action: string;
  createdAt: string;
  approvedAt?: string;
}

export interface OperatorJob {
  id: string;
  status: OperatorJobStatus;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  contextLine: string;
  goal: string;
  instructions?: string;
  avoid: string[];
  stopWhen: string;
  captureMode: "video" | "screenshots";
  partial: boolean;
  failureReason?: string | null;
  actionLedger: OperatorActionEntry[];
  networkLog: { url: string; method: string; status: "allowed" | "blocked"; reason?: string }[];
  screenshots: string[];
  videoBase64?: string | null;
  clicks: { tMs: number; x: number; y: number }[];
  approvalRequests: OperatorApprovalRequest[];
  approvedRiskKinds: string[];
  traceSummary: string;
  finalReport?: string;
  appUnderstanding?: {
    category: string;
    audience: string;
    valueProp: string;
    keyScreens: string[];
  };
  editorBrief?: {
    title: string;
    narrativeArc: string;
    voiceDirection: string;
    suggestedCaptions: string[];
    bestMoments: string[];
  };
}

const STORE_DIR = join(process.cwd(), ".launchreel-agent-jobs");

export function operatorJobId(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeOperatorJob(job: OperatorJob): OperatorJob {
  return {
    ...job,
    screenshots: job.screenshots.slice(0, 8),
    videoBase64: job.videoBase64 ?? null,
  };
}

export async function saveOperatorJob(job: OperatorJob): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(join(STORE_DIR, `${job.id}.json`), JSON.stringify(job, null, 2), "utf8");
}

export async function readOperatorJob(id: string): Promise<OperatorJob | null> {
  if (!/^op_[a-z0-9_]+$/i.test(id)) return null;
  try {
    const raw = await readFile(join(STORE_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as OperatorJob;
  } catch {
    return null;
  }
}

// LaunchReel data model — the vision stores strategy, not just files.
// These are the in-memory shapes that every screen reads from. Later
// milestones swap the mock layer for a real DB without changing these.

export type ProjectStatus = "Live" | "Ready" | "Needs review" | "Draft";

export interface ClickEvent {
  tMs: number;
  x: number;
  y: number;
}

export interface FootageMeta {
  projectId: string;
  kind: "recording" | "agent" | "screenshots";
  durationSec?: number;
  hasAudio: boolean;
  clickCount: number;
  blobKey: string;
  clicks?: ClickEvent[];
  screenshotKeys?: string[];
}

export interface AbPreview {
  variant: number;
  blobKey: string;
  hook: string;
}

export interface VideoScript {
  hook: string;
  cta: string;
  lines: { text: string; startSec: number; endSec: number }[];
  shotList?: ShotListItem[];
}

export interface ShotListItem {
  momentId: string;
  durationSec: number;
  zoomTarget?: { x: number; y: number; scale: number };
}

export interface RenderOutput {
  aspect: "16:9" | "9:16" | "1:1";
  blobKey: string;
  createdAt: string;
}

export interface GeneratedCaptions {
  x: string;
  linkedin: string;
  phFirstComment: string;
  socialClips?: { id: string; caption: string }[];
}

export interface JudgeScores {
  hook: number;
  clarity: number;
  pacing: number;
  artifacts: number;
  total: number;
  pass: boolean;
  notes: string[];
  winner?: number;
  winningHook?: string;
}

export interface InteractiveDemoStep {
  id: string;
  imageKey: string;
  hotspot: { x: number; y: number };
  tooltip: string;
}

export interface InteractiveDemo {
  steps: InteractiveDemoStep[];
  cta: string;
}

export interface CloudBlobRef {
  objectKey: string;
  url: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  oneLiner: string;
  audience: string;
  score: number;
  status: ProjectStatus;
  selectedAngleId: string;
  mainHook: string;
  updatedAt: string;
  audit: LaunchAudit;
  angles: StoryAngle[];
  moments: DemoMoment[];
  assets: LaunchKit;
  analytics: Analytics;
  footage?: FootageMeta;
  renders?: RenderOutput[];
  script?: VideoScript;
  judge?: JudgeScores;
  abPreviews?: AbPreview[];
  captions?: GeneratedCaptions;
  interactiveDemo?: InteractiveDemo;
  outputMode?: "marketing" | "explainer" | "tutorial";
  language?: string;
  cloudBlobs?: Record<string, CloudBlobRef>;
  /** Raw PRD/changelog pasted at intake — powers changelog launch assets. */
  sourceChangelog?: string;
  /** Cinematic AI shots (Seedance) generated for this project. */
  cinematicShots?: SeedanceClip[];
  /** Rendered flagship deliverables (hero / ads / pitch cuts). */
  deliverables?: DeliverableRender[];
  /** AI presenter (talking-head) clip + whether to composite it into renders. */
  avatar?: AvatarClip;
}

/** A talking-head AI presenter clip stored in IndexedDB. */
export interface AvatarClip {
  id: string;
  style: string;
  blobKey: string;
  createdAt: string;
  /** Composite as picture-in-picture in renders. */
  enabled: boolean;
}

export type DeliverableCut = "hero" | "ads" | "pitch";

export interface DeliverableRender {
  cut: DeliverableCut;
  label: string;
  aspect: "16:9" | "9:16" | "1:1";
  blobKey: string;
  createdAt: string;
  /** File extension of the stored container (mp4 or webm). */
  ext?: string;
}

export type SeedanceMode = "text-to-video" | "image-to-video" | "first-last-frame";

/** Creative-director critique of a cinematic shot's sampled frames. */
export interface DirectorScore {
  motion: number;
  brandFidelity: number;
  clarity: number;
  artifacts: number;
  total: number;
  pass: boolean;
  notes: string[];
  improvedPrompt?: string;
}

/** A cinematic AI shot generated via Seedance and stored in IndexedDB. */
export interface SeedanceClip {
  id: string;
  presetId: string;
  label: string;
  mode: SeedanceMode;
  prompt: string;
  aspect: "16:9" | "9:16" | "1:1";
  durationSec: number;
  placement: "intro" | "broll" | "transition" | "outro";
  /** IndexedDB key for the stored mp4 blob. */
  blobKey: string;
  createdAt: string;
  /** Creative-director gate result, if the polish loop ran. */
  director?: DirectorScore;
}

export interface ScoreBreakdown {
  label: string;
  value: number;
}

export interface LaunchAudit {
  score: number;
  strongestAngle: string;
  weakestPoint: string;
  bestAudience: string;
  bestDemoMoment: string;
  recommendedHook: string;
  breakdown: ScoreBreakdown[];
  criticism: string[];
}

export interface StoryAngle {
  id: string;
  kind:
    | "Pain-first"
    | "Speed-first"
    | "Cost-first"
    | "Category-first"
    | "Founder-story";
  hook: string;
  audience: string;
  platformFit: string;
  emotion: string;
  risk: string;
  whyItWorks: string;
  whyItFails: string;
  firstLine: string;
}

export type StoryRole =
  | "Problem setup"
  | "Before"
  | "Magic moment"
  | "Feature reveal"
  | "Proof"
  | "Payoff"
  | "CTA"
  | "Tutorial step"
  | "Remove"
  | "Risky";

export interface DemoMoment {
  id: string;
  timecode: string;
  title: string;
  role: StoryRole;
  why: string;
  keepByDefault: boolean;
  startSec?: number;
  endSec?: number;
  wowScore?: number;
  thumbDataUrl?: string;
}

export interface LaunchAsset {
  id: string;
  title: string;
  meta?: string; // e.g. "Best for: X / LinkedIn" or a format label
  body?: string; // copy assets carry their text here
  blobKey?: string; // IndexedDB key for rendered video/image bytes
}

export interface LaunchKit {
  videos: LaunchAsset[];
  productHunt: LaunchAsset[];
  social: LaunchAsset[];
  copy: LaunchAsset[];
  landingPage: LaunchAsset[];
}

export interface AnalyticsMetric {
  label: string;
  value: string;
}

export interface Analytics {
  metrics: AnalyticsMetric[];
  bestAsset: string;
  weakestAsset: string;
  recommendations: string[];
}

export interface BrandKit {
  logoText: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  font: string;
  voice: VoiceMode;
  cta: string;
  endCard: string;
  watermark: "Subtle" | "Bold" | "None";
  defaultLanguage: string;
  localizedLanguages: string[];
}

export type VoiceMode =
  | "Founder"
  | "Marketer"
  | "Technical"
  | "Investor";

export interface Locale {
  code: string;
  label: string;
  rtl?: boolean;
}

/**
 * Shape returned by the real (bring-your-own-key) Launch Doctor. It overrides
 * the deterministic audit fields when an Anthropic key is connected.
 */
export interface AiAudit {
  score: number;
  strongestAngle: string;
  weakestPoint: string;
  bestAudience: string;
  bestDemoMoment: string;
  recommendedHook: string;
  mainHook: string;
  refinedOneLiner: string;
  breakdown: ScoreBreakdown[];
  criticism: string[];
}

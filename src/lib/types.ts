// LaunchReel data model — the vision stores strategy, not just files.
// These are the in-memory shapes that every screen reads from. Later
// milestones swap the mock layer for a real DB without changing these.

export type ProjectStatus = "Live" | "Ready" | "Needs review" | "Draft";

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
}

export interface LaunchAsset {
  id: string;
  title: string;
  meta?: string; // e.g. "Best for: X / LinkedIn" or a format label
  body?: string; // copy assets carry their text here
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

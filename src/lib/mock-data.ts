import type {
  Analytics,
  BrandKit,
  DemoMoment,
  LaunchKit,
  Locale,
  Project,
  StoryAngle,
} from "./types";

export const LOCALES: Locale[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic", rtl: true },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
];

export const VOICE_CHIPS = [
  "More founder-like",
  "More punchy",
  "Less hype",
  "More technical",
  "More investor-ready",
  "More emotional",
  "More direct",
];

export function anglesFor(name: string, oneLiner: string): StoryAngle[] {
  return [
    {
      id: "pain",
      kind: "Pain-first",
      hook: "Your software is built. Nobody understands it.",
      audience: "Product Hunt, X, indie hackers",
      platformFit: "Product Hunt / X",
      emotion: "Frustration, urgency",
      risk: "Aggressive, but memorable",
      whyItWorks: "It names the founder's exact fear in one line.",
      whyItFails: "Can feel negative if the demo doesn't pay it off fast.",
      firstLine: `You shipped ${name}. Now make a stranger care in 5 seconds.`,
    },
    {
      id: "speed",
      kind: "Speed-first",
      hook: "One recording. Full launch kit in 5 minutes.",
      audience: "Founders with launch deadlines",
      platformFit: "X / LinkedIn",
      emotion: "Relief",
      risk: "Less emotional",
      whyItWorks: "Speed is a concrete, believable promise.",
      whyItFails: "Doesn't create desire on its own.",
      firstLine: "I turned one screen recording into a complete launch.",
    },
    {
      id: "cost",
      kind: "Cost-first",
      hook: "Replace a $2,000 launch video agency.",
      audience: "Bootstrapped founders",
      platformFit: "X / LinkedIn",
      emotion: "Savings, leverage",
      risk: "Can feel cheaper",
      whyItWorks: "Anchors against a price everyone respects.",
      whyItFails: "Risks positioning the product as the budget option.",
      firstLine: "I stopped paying agencies to explain my own product.",
    },
    {
      id: "category",
      kind: "Category-first",
      hook: "The AI launch team for software founders.",
      audience: "Long-term brand",
      platformFit: "LinkedIn / site",
      emotion: "Authority",
      risk: "Needs education",
      whyItWorks: "Claims a category instead of a feature.",
      whyItFails: "Slower to land without proof underneath it.",
      firstLine: `${name} isn't a video tool. It's a launch team.`,
    },
    {
      id: "founder",
      kind: "Founder-story",
      hook: "I built this because good software keeps launching badly.",
      audience: "Founder-led X / LinkedIn",
      platformFit: "X / LinkedIn",
      emotion: "Authenticity",
      risk: "Depends on founder voice",
      whyItWorks: "People back people, especially in build-in-public.",
      whyItFails: "Falls flat without a real, specific story.",
      firstLine: oneLiner,
    },
  ];
}

export function momentsFor(): DemoMoment[] {
  return [
    {
      id: "m1",
      timecode: "00:05–00:11",
      title: "Problem setup",
      role: "Before",
      why: "Shows the messy raw recording before transformation. It creates contrast.",
      keepByDefault: true,
    },
    {
      id: "m2",
      timecode: "00:18–00:26",
      title: "Core product action",
      role: "Magic moment",
      why: "Shows the AI detecting the best clips. This proves the product.",
      keepByDefault: true,
    },
    {
      id: "m3",
      timecode: "00:33–00:41",
      title: "Launch kit reveal",
      role: "Payoff",
      why: "Shows video, gallery images, and posts together — the transformation.",
      keepByDefault: true,
    },
    {
      id: "m4",
      timecode: "00:44–00:49",
      title: "Share page + CTA",
      role: "CTA",
      why: "Ends on the public share page and the action to take.",
      keepByDefault: true,
    },
    {
      id: "m5",
      timecode: "00:52–00:58",
      title: "Settings page",
      role: "Remove",
      why: "Low visual value. Nothing here helps a stranger understand the product.",
      keepByDefault: false,
    },
    {
      id: "m6",
      timecode: "01:03–01:12",
      title: "Account / billing screen",
      role: "Risky",
      why: "Distracts from the story and exposes empty states. Best left out.",
      keepByDefault: false,
    },
  ];
}

export function kitFor(name: string): LaunchKit {
  return {
    videos: [
      { id: "v1", title: "Hero launch video", meta: "16:9 · Product Hunt / YouTube" },
      { id: "v2", title: "Vertical social clip", meta: "9:16 · TikTok / Reels / Shorts" },
      { id: "v3", title: "Square clip", meta: "1:1 · LinkedIn / X" },
      { id: "v4", title: "5-second GIF", meta: "Muted autoplay" },
      { id: "v5", title: "Founder-style cut", meta: "Personal, direct" },
      { id: "v6", title: "Investor-style cut", meta: "Credibility-first" },
    ],
    productHunt: [
      { id: "ph1", title: "Gallery video", meta: "Autoplay-ready" },
      { id: "ph2", title: "Poster image", meta: "1270×760" },
      { id: "ph3", title: "5 gallery screenshots", meta: "Ordered for clarity" },
      { id: "ph4", title: "Product tagline", body: `${name} — the best way to show software.` },
      {
        id: "ph5",
        title: "Product description",
        body: `${name} turns any software product into a professional video, Product Hunt gallery, social clips, launch copy, and a share page — automatically.`,
      },
      {
        id: "ph6",
        title: "First comment draft",
        body: "Hey hunters 👋 I kept watching great products launch with bad explanations, so I built this. Paste your app, get a launch kit. Happy to answer anything.",
      },
      { id: "ph7", title: "Gallery order recommendation", meta: "Payoff first, settings never" },
    ],
    social: [
      {
        id: "s1",
        title: "X launch post",
        meta: "Best for: X",
        body: `Your software is built.\nNow make people understand it.\n\nI built ${name}: paste your app → get a video, PH gallery, social clips, and launch copy in minutes.\n\nLaunching today 👇`,
      },
      {
        id: "s2",
        title: "X thread",
        meta: "Best for: X",
        body: "1/ Most software doesn't fail because it can't be built. It fails because nobody understands it fast enough. Here's how I'm fixing my own launch…",
      },
      {
        id: "s3",
        title: "LinkedIn post",
        meta: "Best for: LinkedIn",
        body: `Distribution is harder than building now. ${name} turns one product recording into a complete launch kit so founders can finally be understood.`,
      },
      {
        id: "s4",
        title: "Build-in-public post",
        meta: "Best for: X",
        body: "Day 1 of launching. Score was 67. The hook explained the feature, not the transformation. Rewrote it. New score: 91.",
      },
    ],
    copy: [
      {
        id: "c1",
        title: "Launch email",
        body: `Subject: Your software is built — now make people understand it\n\nHi {{first_name}},\n\n${name} is live. Paste your app and get a launch-ready video, Product Hunt gallery, social clips, and copy in minutes. No editor, no agency.\n\n→ Generate your launch kit free`,
      },
      {
        id: "c2",
        title: "Beta invite email",
        body: `You're in. ${name} is ready for you. Bring a URL or a screen recording and we'll find the strongest story in it.`,
      },
      {
        id: "c3",
        title: "Follow-up post",
        body: "The 9:16 clip is outperforming the hero video 2:1. Reposting it with a sharper first line.",
      },
      {
        id: "c4",
        title: "Investor update snippet",
        body: `${name} helps software teams turn product workflows into launch-ready assets without hiring a video team.`,
      },
    ],
    landingPage: [
      { id: "lp1", title: "Hero headline", body: "Your software is built. Now make people understand it." },
      { id: "lp2", title: "Subheadline", body: `${name} turns your app into a complete launch kit: video, Product Hunt gallery, social clips, launch copy, and share page.` },
      { id: "lp3", title: "CTA variants", body: "Score my launch · Generate your launch kit free · Make people understand it" },
      { id: "lp4", title: "Feature bullets", body: "• Launch Doctor score\n• Strongest angle, explained\n• Best demo moments, auto-picked\n• Full asset kit, platform-ready" },
      { id: "lp5", title: "FAQ suggestions", body: "Is the video really automatic? · Can I remove the watermark? · Do you support French and Arabic?" },
    ],
  };
}

export function analyticsFor(): Analytics {
  return {
    metrics: [
      { label: "Share page views", value: "428" },
      { label: "Video plays", value: "311" },
      { label: "Avg. watch time", value: "38s" },
      { label: "Completion rate", value: "61%" },
      { label: "CTA clicks", value: "27" },
      { label: "Best referrer", value: "X" },
    ],
    bestAsset: "9:16 vertical clip",
    weakestAsset: "Long hero video",
    recommendations: [
      "Your vertical clip is outperforming the hero video. Post it again with a stronger first sentence.",
      'Your CTA click rate is weak. Change "Try it" to "Generate your launch kit free."',
      "Most viewers drop after 12 seconds. Move the payoff earlier.",
      "Your first gallery image explains the product clearly, but lacks contrast.",
    ],
  };
}

export const PROJECTS: Project[] = [
  {
    id: "launchreel",
    name: "LaunchReel",
    url: "https://launchreel.app",
    oneLiner: "I built this because good software keeps launching badly.",
    audience: "Indie hackers, SaaS founders, Product Hunt launchers",
    score: 91,
    status: "Live",
    selectedAngleId: "pain",
    mainHook: "Your software is built. Now make people understand it.",
    updatedAt: "2 hours ago",
    audit: {
      score: 91,
      strongestAngle: "Your software is built. Now make people understand it.",
      weakestPoint:
        "Your current messaging explains the feature, but not the transformation.",
      bestAudience: "Indie hackers preparing for Product Hunt.",
      bestDemoMoment: "00:42 — raw screen recording becomes a full launch kit.",
      recommendedHook: "Stop launching invisible software.",
      breakdown: [
        { label: "Clarity", value: 82 },
        { label: "Pain intensity", value: 74 },
        { label: "Differentiation", value: 68 },
        { label: "Demo strength", value: 91 },
        { label: "Proof", value: 55 },
        { label: "Launch readiness", value: 79 },
        { label: "Visual quality", value: 84 },
        { label: "CTA strength", value: 72 },
      ],
      criticism: [
        "Your strongest feature is buried too late in the demo.",
        "Your homepage says what the tool does, but not why someone should care today.",
        "Proof is thin — add one concrete before/after to lift differentiation.",
      ],
    },
    angles: anglesFor("LaunchReel", "I built this because good software keeps launching badly."),
    moments: momentsFor(),
    assets: kitFor("LaunchReel"),
    analytics: analyticsFor(),
  },
  {
    id: "invoiceai",
    name: "InvoiceAI",
    url: "https://invoiceai.com",
    oneLiner: "AI that writes and chases your invoices so you get paid faster.",
    audience: "Freelancers and small agencies",
    score: 84,
    status: "Ready",
    selectedAngleId: "speed",
    mainHook: "Get paid faster without chasing a single invoice.",
    updatedAt: "Yesterday",
    audit: {
      score: 84,
      strongestAngle: "Get paid faster without chasing a single invoice.",
      weakestPoint: "The demo shows the feature before it shows the pain.",
      bestAudience: "Freelancers tired of late payments.",
      bestDemoMoment: "00:31 — an overdue invoice auto-chases itself.",
      recommendedHook: "Stop chasing money you've already earned.",
      breakdown: [
        { label: "Clarity", value: 86 },
        { label: "Pain intensity", value: 81 },
        { label: "Differentiation", value: 70 },
        { label: "Demo strength", value: 83 },
        { label: "Proof", value: 64 },
        { label: "Launch readiness", value: 88 },
        { label: "Visual quality", value: 80 },
        { label: "CTA strength", value: 76 },
      ],
      criticism: [
        "Your product looks useful, but the positioning is too broad.",
        "The first 10 seconds are too slow — lead with the overdue invoice.",
      ],
    },
    angles: anglesFor("InvoiceAI", "AI that writes and chases your invoices so you get paid faster."),
    moments: momentsFor(),
    assets: kitFor("InvoiceAI"),
    analytics: analyticsFor(),
  },
  {
    id: "foundercrm",
    name: "FounderCRM",
    url: "https://foundercrm.io",
    oneLiner: "A CRM that actually fits how founders sell.",
    audience: "Early-stage B2B founders",
    score: 67,
    status: "Needs review",
    selectedAngleId: "category",
    mainHook: "The CRM built for founders, not sales teams.",
    updatedAt: "3 days ago",
    audit: {
      score: 67,
      strongestAngle: "The CRM built for founders, not sales teams.",
      weakestPoint: "Your current launch angle sounds like every other CRM.",
      bestAudience: "Founders doing their first 100 sales calls.",
      bestDemoMoment: "00:24 — a deal moves itself forward after a call.",
      recommendedHook: "You're not a sales team. Stop using a sales-team CRM.",
      breakdown: [
        { label: "Clarity", value: 71 },
        { label: "Pain intensity", value: 62 },
        { label: "Differentiation", value: 54 },
        { label: "Demo strength", value: 70 },
        { label: "Proof", value: 48 },
        { label: "Launch readiness", value: 66 },
        { label: "Visual quality", value: 75 },
        { label: "CTA strength", value: 58 },
      ],
      criticism: [
        "Your current launch angle sounds like every other AI tool.",
        "Your demo has a good product moment, but the first 10 seconds are too slow.",
        "Differentiation is your weakest score — say who this is NOT for.",
      ],
    },
    angles: anglesFor("FounderCRM", "A CRM that actually fits how founders sell."),
    moments: momentsFor(),
    assets: kitFor("FounderCRM"),
    analytics: analyticsFor(),
  },
];

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoText: "LaunchReel",
  primaryColor: "#6E56F7",
  accentColor: "#8A78F9",
  backgroundColor: "#0A0A0B",
  font: "Geist",
  voice: "Founder",
  cta: "Generate your launch kit free",
  endCard: "Made with LaunchReel",
  watermark: "Subtle",
  defaultLanguage: "English",
  localizedLanguages: ["French", "Arabic"],
};

export const CREDITS = { remaining: 1, label: "1 free kit" };

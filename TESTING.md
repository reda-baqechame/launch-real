# Testing LaunchReel — manual browser walkthrough

Everything below runs **keyless** in local-free mode. The build, lint, and all API
routes are verified automatically; this guide covers the **browser-only** parts
(canvas rendering, WebAudio, MediaRecorder downloads) that need a real browser to
confirm.

---

## 1. Setup

```bash
npm install
LAUNCHREEL_LOCAL_FREE_MODE=1 npm run dev
```

Open <http://localhost:3000>.

Local-free mode (only active when `NODE_ENV != production` **and** the host is
`localhost`/`127.0.0.1`) swaps every paid provider for a mock: fal.ai (Seedance +
avatar), Anthropic (audit/script/deck/translate/director), and TTS. So you can
click the entire product end-to-end with **no API keys**.

> Generated videos use a real `<canvas>` + `MediaRecorder` pipeline, so a render
> runs roughly in real time (a 60s video takes ~60s). The "preview" / proxy path
> is 540p to keep it quick.

---

## 2. Create a project to test against

1. Go to **`/new`**.
2. Paste any URL (e.g. `https://stripe.com`) and a one-line description.
3. Click **Analyze my launch** and walk through to the result page (the launch kit).
   - Brand auto-fill (B3) fires here in the background: open **`/brand`** afterward
     and the logo/colors should reflect the site (in local-free the logo is derived
     from the hostname, e.g. "Stripe").

The launch-kit page has these tabs in order:
**Video · Editor · Cinematic · Deck · Dub · Personalize · Export · Product Hunt ·
Social Clips · Copy · Landing Page · Share Page · Analytics · Localize**

---

## 3. Per-tab walkthrough (what to click + what "correct" looks like)

### Brand (`/brand`) — B3
- Click **Auto-fill from your site**, paste a URL → logo text + colors populate.
- Hex values are validated before they apply; a customized kit is never clobbered.

### Video — C1 / C2 / C3
- Click **Preview cut** (fast) or **Render full quality**.
- ✅ It plays inline and **downloads as `.mp4`** (Safari/Chrome that support MP4) or
  `.webm` (older Chromium/Firefox) — the filename extension matches (C1).
- ✅ Intro/outro/caption text renders in your **brand font** (C1).
- ✅ Captions are **karaoke-style** — the active word is highlighted in your accent
  color, past words white, upcoming dimmed (C2).
- ✅ The screen recording sits in a **rounded, padded panel with a drop shadow** on a
  brand-gradient background (C3), and **click ripples** pulse where you clicked.
- ✅ If a TTS voice is connected, the **music ducks** under the voiceover and rises in
  gaps; subtle whooshes mark each cut (C2).

### Editor — C4
- Reorder scenes with ↑/↓, change a **Duration**, rewrite a **caption**, edit the
  **hook**/**CTA**, add an unused moment, then **Save edits**.
- Go back to **Video** and render → the change is reflected.

### Cinematic — B1 / B2 / B4 / B6 / C5
- **Generate shot** on any preset → a clip appears almost instantly (branded
  placeholder in local-free) with a **★ director score chip** (e.g. "★ 89 · passed
  director") and a critique note (B6).
- **AI presenter** → **Add presenter** renders a talking-head bubble preview; tick
  **Include presenter in deliverables** (C5).
- **Make 3 deliverables** → hero (16:9), ad (9:16), pitch (16:9) each render and
  preview, **with the cinematic shot at the head + tail** and the presenter PiP in
  the body; each has a **Download** (B4).

### Deck — C6
- **Generate deck** → 6–8 slide cards.
- **Present** → fullscreen; navigate with **→ / ← / space / Esc**.
- **Export to video** → downloads a brand-styled deck video with slide crossfades.

### Dub — C7
- Pick a language → **Translate & render**.
- ✅ A localized video downloads. In local-free the captions carry a `[XX]` language
  tag (e.g. `[ES]`) so you can see the substitution; with a real Anthropic key it's a
  proper translation, and with a TTS voice the **voiceover is dubbed**.

### Personalize — C8
- The box is pre-filled with a sample CSV (`firstName,company` + two rows).
- **Generate N videos** → one file downloads per recipient, with `{{firstName}}` /
  `{{company}}` substituted (put those tokens in your hook/captions via the Editor
  tab first to see it). Capped at 12 rows.

### Export — C9
- Click any platform tile (**LinkedIn 1:1, X 16:9, TikTok/Shorts/Reels 9:16,
  YouTube**) → a correctly-shaped, length-capped video downloads.
- **Download thumbnail** → a branded 16:9 PNG title card.

---

## 4. Keyless vs. real-key matrix

| Feature | Local-free (no keys) | Needs a key |
| --- | --- | --- |
| Audit / script / captions / deck / translate / director | ✅ mocked | `ANTHROPIC_API_KEY` (or BYO key in `/new`) for real output |
| Cinematic shots (Seedance) | ✅ branded placeholder clip | `FAL_KEY` (or BYO `x-fal-key` in `/new`) for real generation |
| AI presenter (lip-sync) | ✅ synthesized talking head | `FAL_KEY` **+ publicly-fetchable audio/image URLs** (hosted blob storage) for true lip-sync |
| Dubbed voiceover | captions only (no VO) | a TTS voice (ElevenLabs/OpenAI) connected in `/new` |
| Brand auto-extract | ✅ logo from hostname | `ANTHROPIC_API_KEY` for a vision-derived palette |
| Video render / framing / captions / export / deck / thumbnail | ✅ fully local | — |

Add real keys to `.env.local` (see `.env.example`) or connect BYO keys on the
`/new` screen (Anthropic, TTS, and fal.ai cards).

---

## 5. Optional — API smoke test (no browser)

With the dev server running in local-free mode:

```bash
H='-H Host:localhost -H content-type:application/json'
curl -s -X POST localhost:3000/api/recap        $H -d '{"durationSec":90}'
curl -s -X POST localhost:3000/api/seedance      $H -d '{"prompt":"crash zoom"}'
curl -s -X POST localhost:3000/api/director      $H -d '{"frames":[{"tSec":0,"dataUrl":"data:image/jpeg;base64,AAAA"}]}'
curl -s -X POST localhost:3000/api/brand-extract $H -d '{"url":"https://stripe.com"}'
curl -s -X POST localhost:3000/api/deck          $H -d '{"productName":"Acme"}'
curl -s -X POST localhost:3000/api/translate     $H -d '{"hook":"Hi","cta":"Go","lines":["one"],"language":"Spanish"}'
curl -s -X POST localhost:3000/api/avatar        $H -d '{}'
```

Each returns local-free JSON (a mock payload), confirming the server side works.

---

## 6. Known limitations / deferred

- **Mid-roll b-roll** and **beat-synced cuts** — cinematic shots blend at the intro
  and outro only (keeps voiceover in sync); mid-body inserts need VO time-remapping.
- **Real lip-sync** needs hosted (publicly-fetchable) audio + image URLs.
- **WebM fallback** on browsers without MP4 `MediaRecorder` support.
- Not yet built: embeddable interactive player, music/B-roll/device-frame asset
  libraries, team collaboration (comments/approval), and auto silence/filler removal
  on raw recordings.

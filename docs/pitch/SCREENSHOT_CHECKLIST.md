# Screenshot checklist (investor / pitch deck)

Capture at **desktop ~1440×900** (and optionally mobile 390×844). Live: https://watchify-web-9rx1.onrender.com  
Wake the Render host before shooting (first load ~30–60s). Use a soft-launch tester from gitignored `testers-credentials.txt` — **never commit passwords**.

## Required shots

| # | File | Screen | Notes |
|---|------|--------|-------|
| 1 | `01-landing.png` (+ `.jpg`) | `/` | Brand + headline + CTA visible; no signed-in chrome preferred |
| 2 | `02-discover.png` | `/discover` | For you / friends watching visible |
| 3 | `03-party-lobby.png` | `/parties` or party create/lobby | Ready / create party UI |
| 4 | `04-in-party.png` | `/parties/[id]` | In-room: chat, presence, or Free sync player |
| 5 | `05-profile.png` | `/profile/[id]` | Customized profile / cosmetics |
| 6 | `06-settings-link.png` | `/settings` | Link accounts / Trakt / honesty copy |
| 7 | `07-watch-match.png` | Discover → Watch Match | Optional but strong if populated |

## Nice-to-have

- Signup page showing Party trial  
- Pricing  
- Mobile landing crop  
- Side-by-side host + guest (two windows)

## Capture

```bash
node scripts/capture-pitch-screenshots.mjs
# optional: WATCHIFY_URL=http://localhost:3344 node scripts/capture-pitch-screenshots.mjs
```

Images land in `docs/pitch/screenshots/`. Compress if any file exceeds ~800KB.

## Demo video

Polished local capture (gitignored):  
`demos/watch-party-rich-2026-07-19T23-06-41/watchify-party-full-demo.mp4`  
Script: [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

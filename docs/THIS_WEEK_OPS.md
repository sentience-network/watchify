# This week ops — founder party night

Short checklist for the soft-launch party night + pitch metrics. Product already has guest join, reminders, trial CTAs, and `/admin/analytics` pitch targets — this is founder execution.

Related: [TESTER_ONE_PAGER.md](./TESTER_ONE_PAGER.md) · [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) · [LAUNCH_2_WEEKS.md](./LAUNCH_2_WEEKS.md) · [pitch/PITCH_ONE_PAGER.md](./pitch/PITCH_ONE_PAGER.md)

---

## Before the night

1. **Schedule ~20 Party testers** — one concrete time (calendar invite). Prefer a Watchify Free title so sync playback is real.
2. **Wake Render** 5–10 minutes early (`https://watchify-web-9rx1.onrender.com` + health). Free host sleep is ~30–60s.
3. **Confirm env (do not regenerate):** `CRON_SECRET`, `VAPID_*`, Resend/SMTP. Reminders also tick every 10m while any tester is signed in.
4. **Host path smoke:** Free title party → invite link → guest join on a second device → chat/Ready → optional face video.
5. **Phone install (optional but good demo):** one tester Add to Home Screen (iOS Safari Share → Add to Home Screen; Android Chrome Install). See [MOBILE.md](./MOBILE.md).

---

## During

1. Host creates the Free-title party; paste invite in the tester group.
2. Ask at least one person to join as **guest** (no signup), then use **Save my account** so convert/merge is exercised.
3. Optional: one tester enables Settings → **Come back tonight** push.
4. Note wake delays, join confusion, video issues — only top frictions.

---

## Same night feedback (3 questions)

1. Would you invite a friend to the next one? (Y/N + why)
2. Top friction? (cold start / invite join / video / copy / other)
3. Would you host a room yourself this week?

Log answers against [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) tester script.

---

## Metrics → pitch (copy real numbers only)

Open `/admin/analytics` (staff) → **Pitch metrics** block.

| Metric | Target ([LAUNCH_2_WEEKS](./LAUNCH_2_WEEKS.md)) | Where to paste |
|--------|-----------------------------------------------|----------------|
| Invite → join | ≥ 35% | [PITCH_ONE_PAGER.md](./pitch/PITCH_ONE_PAGER.md) |
| Rooms ≥2 people | ≥ 40% | same |
| D1 return | ≥ 25% of joiners | same |
| Invite depth (max) | ≥ 2 (A→B→C) | same |

Export: `/api/admin/analytics?days=30&format=csv` or `format=json`.

Do **not** invent numbers. If a cell is empty, leave “replace with real metrics.”

---

## Demo artifact

- Script: [pitch/DEMO_SCRIPT.md](./pitch/DEMO_SCRIPT.md) (includes guest join).
- Screenshots: [pitch/SCREENSHOT_CHECKLIST.md](./pitch/SCREENSHOT_CHECKLIST.md) / `npm run pitch:screenshots` if Playwright is available.
- Prefer a short 60–90s capture over a perfect long video.

---

## Still founder-only (not code)

- Scheduling the tester party night and chasing RSVPs
- Forcing one organic invite chain (tester invites a non-tester)
- Filling the ask / `$` in the pitch one-pager
- Deciding on paid always-on Render / custom domain **only if** analytics + notes blame wake time

---

## Reminder reliability (free)

If nobody is signed in for hours, opportunistic ticks pause. Options that stay free:

- Keep a browser tab open on Discover during party week, or
- Point a free external cron (e.g. cron-job.org) at  
  `GET https://watchify-web-9rx1.onrender.com/api/cron/reminders`  
  with `Authorization: Bearer $CRON_SECRET` every 10–15 minutes.

Do not regenerate VAPID/CRON keys already on Render.

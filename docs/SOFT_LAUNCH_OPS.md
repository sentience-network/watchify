# Soft-launch ops (founder checklist)

Live: https://watchify-web-9rx1.onrender.com  
Realtime: https://watchify-realtime.onrender.com  

Code can ship social-graph density and honest CTAs. These items need a human in **Render / DNS / Neon** (no paid upgrades without your approval).

## Postgres (Neon)

- **Status (local `.env.production`):** `DATABASE_URL` is Neon Postgres (`*.neon.tech`), not SQLite.
- **Live health:** `/api/health` → `"db":"ok"`.
- **Schema:** Keep deploying with `prisma migrate deploy` / Render build prep (`db:prepare-postgres` + generate).
- **Backups:** Neon dashboard → Branches / Backups (or scheduled `pg_dump`). Document restore owner (you).
- **Do not** point production at `file:./dev.db`.

## TURN / ICE (face video) — VERIFIED PASS

App path: `GET /api/realtime/ice` (auth required). Prefers Metered credential API, then static `TURN_*`, then optional Open Relay. Public `/api/config` exposes `turnEnvConfigured` (boolean only — no secrets).

| Variable | Purpose |
|----------|---------|
| `METERED_DOMAIN` | Metered subdomain (no `https://`) — Blueprint: `watchify.metered.live` |
| `METERED_TURN_API_KEY` | Metered TURN REST key (`sync: false` in `render.yaml` → dashboard secret) |
| `TURN_URL` / `TURN_USER` / `TURN_PASS` | Static TURN fallback (optional while Metered works) |
| `WATCHIFY_OPEN_RELAY_TURN` | Keep `false` in prod |

### Live verification (2026-07-24 recheck)

| Check | Result |
|-------|--------|
| Metered REST credentials API | **PASS** — HTTP 200, TURN+STUN URLs, usernames present |
| Live `/api/config` | **PASS** — `turnEnvConfigured: true` |
| Live `/api/health` + realtime `/` | **PASS** |
| Live ICE (anonymous) | **401** Sign in required (expected) |
| Live ICE (tester01 session, 2026-07-20) | **PASS** — `turnConfigured: true`, `provider: "metered"` |
| Local `.env` / `.env.production` | Metered + static `TURN_*` present |
| `watchify-realtime` | Signaling only — **no TURN env needed** |
| Blueprint | `METERED_*` + optional static `TURN_*` (`sync: false`) on **watchify-web** |

**Verdict: TURN is working on production (Metered free tier).** No purchase required.

**Optional hardening (dashboard):** also set static `TURN_URL` / `TURN_USER` / `TURN_PASS` on **watchify-web** from local `.env.production` so ICE can fall back if the Metered credential API flakes. No Render CLI / `RENDER_API_KEY` on this PC — paste in dashboard only; do not commit.

Self-hosted coturn (path C) is **not** needed while Metered works. Optional compose stub: `scripts/coturn/docker-compose.yml` (requires an owned host + open UDP/TCP TURN ports — do not buy a VPS without approval).

### How to test video across strict NAT

1. Two clients on **different NATs** (Wi‑Fi vs cellular, or two carriers). Same Wi‑Fi is insufficient.
2. Join the same party → enable camera or screen share → confirm media within ~10s.
3. Desktop: `chrome://webrtc-internals` → peer connection → candidate pairs should include **relay** when STUN fails.
4. Regressions: signed-in `GET /api/realtime/ice` should report `provider: "metered"` (or `"static"`). `stun-only` means env missing.

If ICE ever regresses to `provider: "stun-only"`:

1. Render → **watchify-web** → **Environment**
2. Confirm `METERED_DOMAIN` = `watchify.metered.live` (no `https://`)
3. Confirm `METERED_TURN_API_KEY` matches local `.env.production` (paste values from that file — do not commit)
4. Optional: add `TURN_URL`, `TURN_USER`, `TURN_PASS` from the same file
5. Keep `WATCHIFY_OPEN_RELAY_TURN` = `false`
6. Manual Deploy / restart **watchify-web**, then re-check signed-in `/api/realtime/ice`

## Cold start / domain (no purchase in this pass)

| Item | Action | Money? |
|------|--------|--------|
| Always-on | Render paid instance / “never sleep” so first paint isn’t 30–60s | Yes — **your approval** |
| Custom domain | Render → Custom Domains + DNS CNAME/A at registrar | DNS only |
| Tester brief | Tell friends: first load may hang while free tier wakes; wait & retry | Free |

In-app copy already warns on landing + sign-in. Upgrading Render is **not** done by agents without approval.

## Home / plan honesty

- Guests: Sign up / See who’s watching / Join a party / Sign in — **not** “Start a party” as the only CTA.
- Signed-in Free/Plus: See who’s watching + Join; host CTA points at Pricing.
- Party plan (incl. seeded testers): Start a party available.

## Social graph (shipped)

- Friends / Discover: `@handle` / name search + empty-state CTAs
- Prod seed: `npm run db:seed-tester-friends:prod` — tester01–20 mutual friends (19 each)
- Regular users still send/accept friend requests

```bash
npm run db:seed-testers:prod
npm run db:seed-tester-friends:prod
```

## Trakt (free history import — not streaming)

Trakt developer OAuth apps are **free**. VIP is not required. Watchify uses Trakt for optional watched-history import / metadata only — not playback. API rate limits apply.

| Variable | Purpose |
|----------|---------|
| `TRAKT_CLIENT_ID` | OAuth app Client ID (`sync: false` on Render) |
| `TRAKT_CLIENT_SECRET` | OAuth app Client Secret (`sync: false` on Render) |
| `TRAKT_REDIRECT_URI` | Must match Trakt app Redirect URI exactly — Blueprint sets production callback |
| `TOKEN_ENCRYPTION_SECRET` | Already required — seals stored Trakt tokens |

### One-time setup

1. Sign in at https://trakt.tv/oauth/applications → **New Application**
2. Name: `Watchify` (or similar)
3. Redirect URI (production): `https://watchify-web-9rx1.onrender.com/api/trakt/callback`
4. Optional second app for local: Redirect URI `http://localhost:3344/api/trakt/callback`
5. Copy Client ID + Client Secret into gitignored `.env` / `.env.production` and Render → **watchify-web** → Environment
6. Redeploy / restart **watchify-web**, then Settings → **Connect Trakt**
7. Confirm live `/api/config` shows `"traktConfigured": true` (boolean only — no secrets)

Do **not** commit secrets. Local redirect URI values (non-secret) may already be in `.env*`.

## Party trial (new signups)

New credential + OAuth signups get **`plan=party`** for **30 days** (`partyTrialEndsAt`).
Expiry is applied on auth / `/api/me` / hydrate reads (no cron). Stripe subscriptions clear the trial.
Seeded tester comps keep `partyTrialEndsAt = null` and are never auto-downgraded.
After trial, Free users keep **`freeHostsRemaining`** (default 1) for one lifetime host.

## Amazon Associates (optional, free)

Rent/Buy and Prime Video deep links call `withAmazonAffiliate()` when a tag is set.
Sign up at https://affiliate-program.amazon.com/ (free), then set on **watchify-web**:

| Variable | Purpose |
|----------|---------|
| `AMAZON_AFFILIATE_TAG` | Associates tracking tag (server) |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Optional client-side fallback |

Do **not** invent a fake tag. Links work without it — they just won't attribute.

## Company email (founder inbox)

**Address:** `dorian@watchify.app` (contact / support / admin)  
**App From:** `Watchify <hello@watchify.app>`  

Full steps (domain ownership check, Cloudflare Email Routing + Resend, SPF/DKIM/DMARC): **[COMPANY_EMAIL.md](./COMPANY_EMAIL.md)**.

| Variable | Value |
|----------|-------|
| `EMAIL_FROM` | `Watchify <hello@watchify.app>` |
| `CONTACT_EMAIL` / `SUPPORT_EMAIL` / `ADMIN_EMAIL` | `dorian@watchify.app` |
| `RESEND_API_KEY` | Render secret (`sync: false`) |
| `VAPID_SUBJECT` | `mailto:dorian@watchify.app` |

**Blocker:** `watchify.app` must be owned with DNS you control (currently parked on Afternic NS — see COMPANY_EMAIL.md). Do not purchase domains from this checklist without your explicit approval.

## Related docs

- [COMPANY_EMAIL.md](./COMPANY_EMAIL.md) — mailbox + DNS + Resend  
- [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) — product soft-launch checklist  
- [TESTER_ONE_PAGER.md](./TESTER_ONE_PAGER.md) — friend-facing expectations  
- [THIS_WEEK_OPS.md](./THIS_WEEK_OPS.md) — party-night runbook  
- [LAUNCH_2_WEEKS.md](./LAUNCH_2_WEEKS.md) — 14-day plan  
- [POSTGRES.md](./POSTGRES.md) — local → Postgres switch  
- Gitignored logins: `friend-tester-logins.txt`, `testers-credentials.txt`

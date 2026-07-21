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

### Live verification (2026-07-20)

| Check | Result |
|-------|--------|
| Metered REST credentials API | **PASS** — HTTP 200, TURN+STUN URLs, usernames present |
| Live ICE (anonymous) | **401** Sign in required (expected) |
| Live ICE (tester01 session) | **PASS** — `turnConfigured: true`, `provider: "metered"`, `turn`/`turns` servers |
| Local `.env` / `.env.production` | Metered + static `TURN_*` present |
| `watchify-realtime` | Signaling only — **no TURN env needed** |

**Verdict: TURN is working on production.** No purchase required. Optional hardening: also set static `TURN_*` on Render as Metered fallback.

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

## Related docs

- [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) — product soft-launch checklist  
- [TESTER_ONE_PAGER.md](./TESTER_ONE_PAGER.md) — friend-facing expectations  
- [POSTGRES.md](./POSTGRES.md) — local → Postgres switch  
- Gitignored logins: `friend-tester-logins.txt`, `testers-credentials.txt`

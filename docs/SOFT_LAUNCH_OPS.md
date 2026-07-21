# Soft-launch ops (founder checklist)

Live: https://watchify-web-9rx1.onrender.com  
Realtime: https://watchify-realtime.onrender.com  

Code can ship social-graph density and honest CTAs. These items need a human in **Render / DNS / Neon** (no paid upgrades without your approval).

## Postgres (Neon)

- **Status (local `.env.production`):** `DATABASE_URL` is Neon Postgres (`*.neon.tech`), not SQLite.
- **Schema:** Keep deploying with `prisma migrate deploy` / your existing Render build prep (`db:prepare-postgres` + generate). After schema changes, confirm `/api/health` returns `"db":"ok"`.
- **Backups:** Neon free/launch tiers include point-in-time recovery on paid plans; on free, use Neon dashboard → **Branches / Backups** (or export with `pg_dump` on a schedule). Document restore owner (you).
- **Do not** point production at `file:./dev.db`.

## TURN / ICE (face video)

App path: `GET /api/realtime/ice` (auth required). Prefers Metered credential API, then static `TURN_*`, then optional Open Relay.

| Variable | Purpose |
|----------|---------|
| `METERED_DOMAIN` | Metered subdomain (no `https://`) |
| `METERED_TURN_API_KEY` | Metered TURN REST key |
| `TURN_URL` / `TURN_USER` / `TURN_PASS` | Static TURN fallback |
| `WATCHIFY_OPEN_RELAY_TURN` | Dev-only public relay; keep `false` in prod |

**Local `.env`:** Metered + TURN keys are present.  
**Local `.env.production`:** historically Stripe/DB/email only — TURN was **not** mirrored.  
**Render:** Confirm the **web** service env includes Metered or `TURN_*`. If missing, face video falls back to STUN (or Open Relay only if enabled) and fails on strict NATs.

Checklist:

1. Render → watchify-web → Environment → add Metered (or TURN_*) from local `.env`.
2. Redeploy web (or restart).
3. Sign in → open a Party room with face video on two networks → confirm no “TURN is not configured” warning.

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

## Social graph scripts

```bash
npm run db:seed-testers:prod          # Party seats tester01–20
npm run db:seed-tester-friends:prod   # Mutual friends among those testers only
```

Regular users still send/accept friend requests. Testers can also search `@handle` in Friends / Discover.

## Related docs

- [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) — product soft-launch checklist  
- [TESTER_ONE_PAGER.md](./TESTER_ONE_PAGER.md) — friend-facing expectations  
- [POSTGRES.md](./POSTGRES.md) — local → Postgres switch  
- Gitignored logins: `friend-tester-logins.txt`, `testers-credentials.txt`

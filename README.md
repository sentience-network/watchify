# Watchify

**Watch together. Across every screen.** — the social layer for everything you watch.

Catalogs are commoditized; Watchify is cross-service presence, parties, and shared taste. See [VISION.md](./VISION.md) for the moat, flywheel, and content ladder.

## Quick start

```bash
cd watchify
cp .env.example .env          # Prisma reads DATABASE_URL from .env
cp .env.example .env.local    # optional; fill secrets for production features
npm install
npx prisma migrate dev --name week1_backend_truth
npm run db:seed
npm run dev                   # Next :3344 + Socket.io realtime :3345
```

Open [http://localhost:3344](http://localhost:3344).

## Soft launch

See [docs/SOFT_LAUNCH.md](./docs/SOFT_LAUNCH.md), **2-week plan** [docs/LAUNCH_2_WEEKS.md](./docs/LAUNCH_2_WEEKS.md), and [docs/POSTGRES.md](./docs/POSTGRES.md).

Interactive tester script (in-app): [http://localhost:3344/soft-launch](http://localhost:3344/soft-launch)

```bash
npm run launch:check          # local readiness
npm run launch:check:prod     # fail if prod secrets missing
docker compose -f docker-compose.launch.yml up -d db   # Postgres on :5432
# Full prod-shaped stack (after .env.production + prisma postgresql):
# docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Demo sign-in: `alex@watchify.app` / `watchify-demo` (admin, pre-verified)  
Second user (multi-browser / mod): `jordan@watchify.app` / `watchify-demo`  
Health: [http://localhost:3344/api/health](http://localhost:3344/api/health)
TV companion: [http://localhost:3344/tv](http://localhost:3344/tv)

### Feel the product

| Go here | Why |
|---------|-----|
| `/` | Positioning landing |
| `/discover` | Social streaming OS — friends watching, live parties, For You |
| `/parties` | Create room → copy invite → **live** chat / sync / presence |
| `/library` + `/watch/free1` | Free synced playback |
| `/settings` | Link streaming services (badges only) |
| `/pricing` | Plans — demo mode or live Stripe Checkout |
| `/admin/reports` | Soft moderation queue (alex/jordan) |
| `/admin/analytics` | Staff-only 30-day launch funnel |
| `/content` | How we acquire catalog legally |

## Week 4 — soft-launch wedge

- **Presence:** manual sharing remains the reliable cross-service path. Optional Trakt OAuth imports recent history; it never claims Netflix/Disney access or live player presence. Tokens use AES-256-GCM at rest.
- **Invites:** `/share/party/{inviteCode}` is a public DB-backed preview. Signed-out users return after auth and join durable membership. Invites expire after seven days and hosts can revoke/rotate them.
- **Analytics:** content-free funnel events are stored internally; staff view aggregates at `/admin/analytics`. Optional PostHog configuration is consent-gated and not required.
- **Face video:** joined members see an opt-in WebRTC panel in `/parties`. Party-plan hosts enable rooms, capped at six people. Socket.io relays signaling only; media is peer-to-peer and never stored. TURN is required for reliable production NAT traversal.
- **Launch ops:** deployment checklist and 10–20 user script are in [`docs/SOFT_LAUNCH.md`](./docs/SOFT_LAUNCH.md).

## Week 3 — Money + accounts

Hardens billing, auth recovery, moderation, and soft-launch ops. **DB plan is source of truth** — never treat `?billing=success` alone as paid.

### Stripe (live path)

| Piece | Path / behavior |
|-------|-----------------|
| Checkout | `POST /api/stripe/checkout` → Stripe Checkout; success → `/billing/success?session_id={CHECKOUT_SESSION_ID}` |
| Session sync | `GET /api/stripe/session?session_id=` re-fetches Stripe + writes `User.plan` |
| Webhook | `POST /api/stripe/webhook` — `checkout.session.completed`, `customer.subscription.updated/deleted` |
| Portal | `POST /api/stripe/portal` — Customer Portal |
| Demo mode | No Stripe keys → amber banner; signed-in **Activate demo** still `PATCH`es plan in DB |

**Dashboard steps:** create Plus ($4.99) + Party ($9.99) recurring Prices → put Price IDs in `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_PARTY` → API keys → webhook to `/api/stripe/webhook` (or `stripe listen --forward-to localhost:3344/api/stripe/webhook`) → enable Customer Portal. Optional: enable **Stripe Tax** in Dashboard, then `STRIPE_TAX_ENABLED=true`.

**Smoke test**

- **Demo (no keys):** sign in → `/pricing` → Activate Plus/Party → Settings shows plan; no charge.
- **Live keys:** `stripe listen` + Checkout → land on `/billing/success` → plan from session API/DB → Portal cancel → webhook sets plan `free`.

### Email verify + password reset

| Flow | Where |
|------|--------|
| Signup | Sends verification token (DB); console prints link if no `RESEND_API_KEY` / SMTP |
| Verify | `/auth/verify?token=` → `POST /api/auth/verify` |
| Banner | App shell shows “verify email” until `emailVerifiedAt` is set |
| Forgot / reset | `/auth/forgot` → `/auth/reset?token=` |
| Demo users | Seeded with `emailVerifiedAt` set |

Email transport order: **Resend** → **SMTP (Nodemailer)** → **console**.

### Soft moderation

- UI: `/admin/reports` (also **Mod queue** in sidebar for staff)
- Roles: `user` \| `mod` \| `admin` — seed **alex=admin**, **jordan=mod**
- Actions: dismiss / warn flag (`warnedAt`) / soft-ban (`bannedAt` — blocks sign-in + API posting)

### Health / ops

- `GET /api/health` — DB ping, realtime URL note, stripe/email transport flags
- Durable rate limits: `RateLimitBucket` table (auth/billing routes)
- **SQLite backup:** stop writes, copy `prisma/dev.db` (or migrate to Postgres for production)

### Soft-launch checklist

- [ ] `NEXTAUTH_SECRET` + `NEXTAUTH_URL` set
- [ ] `npm run db:seed` (demo users + sample report)
- [ ] Two-process dev: `npm run dev` (Next **3344** + realtime **3345**)
- [ ] Stripe: products/prices, webhook URL, portal; or accept demo mode banner
- [ ] Email: `RESEND_API_KEY` or SMTP, or rely on console links in logs
- [ ] Hit `/api/health` and realtime root (`:3345`)
- [ ] Mod: sign in as alex → `/admin/reports` → act on seeded report

## Week 2 — Realtime social

Socket.io companion server fans out party events; Prisma remains the source of truth.

| Process | Port | Command |
|---------|------|---------|
| Next.js app | **3344** | `npm run dev:next` |
| Realtime (Socket.io) | **3345** | `npm run dev:realtime` |
| Both (default) | | `npm run dev` via `concurrently` |

Auth: signed short-lived room tokens from `POST /api/realtime/token` (HMAC with `REALTIME_SECRET` or `NEXTAUTH_SECRET`). No paid keys required locally.

### Live events

| Event | What happens |
|-------|----------------|
| `message` | Party chat — persisted + instant across browsers |
| `reaction` | Emoji reactions fan out live |
| `playback` | Free-title / soft sync playhead (play/pause/seek) |
| `presence` | Who is online in the room (ephemeral in memory) |
| `typing` | Optional typing indicators |
| Invite `?invite=` | Creates `PartyMember` in DB, then socket joins the room |

Full-state poll drops to ~45s while sockets are connected (12s fallback if realtime is down).

### Two-browser magic (Alex + Jordan)

1. `npm run db:seed` then `npm run dev` (confirm both `next` and `rt` start).
2. Browser A: sign in as `alex@watchify.app` / `watchify-demo` → `/parties`.
3. As Alex (Party plan): create a **Watchify Free** party → **Copy invite**.
4. Browser B (Incognito): sign in as `jordan@watchify.app` / `watchify-demo` → paste invite URL.
5. Jordan auto-joins as a real `PartyMember` — panel shows **Live** + online presence.
6. Chat from either browser appears instantly; reactions too.
7. Play/pause/seek the free player — the other browser follows within ~1s.
8. Close one tab — presence drops the offline member.

Health check: [http://localhost:3345](http://localhost:3345) → `{"ok":true,"service":"watchify-realtime"}`.

## Week 1 — Backend truth

Social data and auth use **SQLite via Prisma** (zero-friction local). Swap `provider` + `DATABASE_URL` in `prisma/schema.prisma` for Postgres in production.

| Command | Purpose |
|---------|---------|
| `npx prisma migrate dev` | Apply schema migrations (creates `prisma/dev.db`) |
| `npm run db:seed` | Demo users, friendships, parties, watchlists |
| `npm run db:reset` | Wipe DB + re-migrate + seed |
| `npm run build` | `prisma generate` + Next build (realtime is a separate entry) |

**Server wins:** friends, friend requests, watchlists, presence, parties, join requests, party messages, blocks, reports, and **plan** are stored in the DB. Auth signup/signin read/write the `User` table. Stripe webhooks and demo plan changes update `User.plan`; the JWT refreshes plan from the DB on each session.

**localStorage** still caches UI state for faster paint and stores **cookie consent** device-locally. On conflict, `/api/me/state` overwrites the cache.

## Pricing

| Plan | Price | Highlights |
|------|-------|------------|
| **Free** | $0 | Join parties, see friends watching, link 2 services, taste graph |
| **Plus** | $4.99/mo | Unlimited lists, all service links, social profiles |
| **Party** | $9.99/mo | Host unlimited live rooms, co-hosts, recurring rooms |

Stripe missing → honest demo mode (plan still saved in DB via authenticated API).

## Legal modes (never piracy)

- **Social share** — friends see watching metadata without needing your membership
- **Own-account sync** — each person uses their own streaming login + deep links
- **Watchify Free** — CC/PD/sample titles with in-app playback + party sync
- **Screen share** — free/owned media only; paid streamer apps blocked

## Catalog & deep links

- **Free library:** verified public-domain / Creative Commons / AVOD-sample titles with attribution + in-app playback.
- **Demo catalog (~100+):** curated popular titles with genres, posters, trailers, and provider deep links (Netflix, Max, Hulu, Prime, Disney+, Peacock, Paramount+, Apple TV+). Search URLs always work; some titles include title-specific IDs.
- **TMDB (optional):** set `TMDB_API_KEY` for live watch/providers metadata via `/api/catalog/providers`. Without a key, curated seed links are used and Discover shows a demo-catalog note. Watchify never scrapes or proxies paid streams.
- **Timestamps:** party invites join Watchify chat/realtime immediately. Free titles auto-seek. Paid services open a deep link + show a scrub-to-time helper — most streamers do **not** accept a start time in the URL.

Share sheet: X, Facebook, Reddit, LinkedIn, WhatsApp, Telegram, SMS, Email, copy link, native Web Share, plus honest copy-then-open flows for Instagram / TikTok / Snapchat (no fake “shared” when the platform cannot compose a post).

Env vars: see `.env.example`. Stack: Next.js 14, NextAuth, Prisma/SQLite, Socket.io, Stripe, Tailwind.

**SQLite soft-launch note:** treat `prisma/dev.db` as the data file — back it up before risky migrations; for multi-instance production switch Prisma `provider` to `postgresql`.

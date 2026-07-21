# Watchify soft launch

> **Ops / Render / DNS / TURN / Neon:** see [`SOFT_LAUNCH_OPS.md`](./SOFT_LAUNCH_OPS.md)  
> **Friend-facing one-pager:** see [`TESTER_ONE_PAGER.md`](./TESTER_ONE_PAGER.md)

## Production deployment

- Use Postgres: change Prisma datasource provider to `postgresql`, set `DATABASE_URL`, run `prisma migrate deploy`, and test restore procedures before launch.
- Run Next (`npm start`, port 3344) and realtime (`npm run start:realtime`, port 3345) as separate supervised processes. Route WebSocket upgrades to realtime and set `NEXT_PUBLIC_REALTIME_URL`.
- Set unique production `NEXTAUTH_SECRET`, `REALTIME_SECRET`, and 32+ character `TOKEN_ENCRYPTION_SECRET`. Back up the encryption secret separately; losing it makes Trakt tokens unreadable.
- Configure Stripe webhook `/api/stripe/webhook`, HTTPS email links, and exact Trakt callback `/api/trakt/callback`.
- Set canonical HTTPS `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `ALLOWED_ORIGINS`, and restricted CORS/firewall rules.
- Video uses Google STUN locally. Production should set `TURN_URL`, `TURN_USER`, `TURN_PASS`; use expiring credentials where supported. The first release is a peer mesh capped at 6; larger rooms require an SFU and bandwidth/cost planning.
- Monitor `/api/health`, realtime root, WebSocket disconnect rate, OAuth/webhook failures, DB saturation, disk/backups, email bounces, TURN allocation failures, and error logs. Do not log tokens, chat content, or SDP.
- Run daily encrypted DB backups with retention and a monthly restore drill. Document incident ownership and token/key rotation.

## Launch checklist

> Full 14-day plan: [`LAUNCH_2_WEEKS.md`](./LAUNCH_2_WEEKS.md)

- [ ] Migrations applied; seed only in non-production
- [ ] Auth, email verify/reset, Stripe test checkout/portal/webhook verified
- [ ] Trakt configured or UI visibly reports “not configured”
- [ ] Signed-out invite preview → signup/signin → DB membership verified on a second device
- [ ] Revoked, expired, full, blocked, banned, private, and ended invite messages checked
- [ ] Manual presence works with no third-party keys
- [ ] Two-browser chat, reactions, playback sync, reconnect, and first-message event checked
- [ ] Two-device camera/mic opt-in, denial, mute, leave, reconnect, and TURN path checked
- [ ] `/admin/analytics` and `/admin/reports` deny normal users
- [ ] CC attribution links checked; no uncertain title labelled licensed
- [ ] Responsive keyboard/screen-reader smoke test
- [ ] Health monitoring, alerts, backups, restore, domains, TLS, CORS complete
- [ ] PWA installable; `/tv` companion usable on living-room browser
- [ ] `npm run launch:check:prod` exits GO
- [ ] `WATCHIFY_DEV_BILLING` / demo login off in production

## Catalog strategy (honest)

- Expand free/CC/public-domain + official YouTube trailers that are clearly allowed.
- Do **not** scrape Netflix/etc. Use curated deep-link patterns, or `TMDB_API_KEY` for live watch/providers metadata only.
- Deep link to a title on streamers: yes where URL schemes exist.
- Exact timestamp into Netflix/etc. players: usually **not** supported. Party invite = join chat + show live playhead + “Open on [Service]” + scrub helper. Watchify Free = real seek-to-playhead.
- Never pirate or proxy paid streams.

## Share platforms

Share menus appear on watchlists, parties/invites, profiles, watching-now, free titles, and invite cards. Platforms: X, Facebook, Reddit, LinkedIn, WhatsApp, Telegram, SMS/Messages, Email, copy link, native Web Share; Instagram/TikTok/Snapchat use copy-link + open app with clear UX (no fake native share success). OG/Twitter cards use `summary_large_image` for paste into FB/iMessage/etc.

## 10–20 person tester script

1. Open the landing page and create an account; verify email.
2. Share a title manually. If a Trakt test app is configured, connect and refresh history; otherwise confirm the honest configuration message.
3. Host creates a Watchify Free party and sends the invite to a signed-out tester on another browser/device.
4. Tester reviews access/safety details, signs in or signs up, returns to the invite, and joins.
5. Send chat/reactions and test free-title play/pause/seek. Disable realtime briefly and confirm reconnect feedback.
6. Join face video with camera off, then repeat with granted camera/mic. Test mute, camera off, permission denial, leave, and reconnect. Do not screen-share paid services.
7. Host revokes the old invite and creates a new seven-day invite; verify the old URL fails.
8. Report a test account/content issue and have staff review moderation and `/admin/analytics`.
9. Record browser/device/network, confusing copy, failures, and whether you would invite another person.

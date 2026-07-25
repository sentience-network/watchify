# Company email (watchify.app)

**Canonical address (founder / contact / admin):** `dorian@watchify.app`  
**Additional team address:** `nicole@watchify.app`  
**Transactional From (app sends):** `Watchify <hello@watchify.app>`  
**Product domain:** `watchify.app` (used throughout seeds, calendars, docs — not `.com`)

App wiring lives in `src/lib/company-email.ts` and `src/lib/email.ts`. Env templates: `.env.example`, `.env.production.example`, `render.yaml`.

---

## Blocker first: do you own the domain?

As of soft-launch setup checks, **`watchify.app` DNS points at Afternic parking nameservers** (`ns1.afternic.com` / `ns2.afternic.com`) with a null MX (no mailbox). That usually means the name is **listed for sale / parked**, not under Watchify’s control.

**You cannot create `dorian@watchify.app` until you:**

1. Purchase or transfer **watchify.app** at a registrar you control (or buy it from the current Afternic/GoDaddy listing if still for sale), **or**
2. Point product email at another domain you already own (e.g. a temporary `watchify.yourname.com`) and set env overrides — update branding later.

Agents will **not** purchase domains or paid Workspace for you. Confirm ownership in your registrar dashboard before continuing.

Optional interim while waiting on DNS: keep using Resend’s `onboarding@resend.dev` for verify/reset smoke tests only (low deliverability; not for real testers).

---

## Recommended soft-launch stack (practical + cheap)

| Need | Tool | Cost |
|------|------|------|
| Receive mail at `dorian@` / `nicole@` / `hello@` | **Cloudflare Email Routing** → forward to your personal Gmail/Outlook | Free |
| Send verify / reset / reminders from the app | **Resend** (already integrated) + verified `watchify.app` | Free tier is enough for soft launch |
| Full Gmail-style mailbox (optional later) | Google Workspace or Microsoft 365 | Paid — skip until you need shared calendars / Drive |

**Why not Workspace first?** Soft launch only needs (1) a public contact address and (2) authenticated outbound mail. Forwarding + Resend covers both without a monthly seat.

---

## Step-by-step (after you own `watchify.app`)

### A. Point DNS at Cloudflare (recommended)

1. Create a free [Cloudflare](https://dash.cloudflare.com/) account.
2. Add site `watchify.app` → copy Cloudflare nameservers.
3. At your registrar, set NS to Cloudflare’s values; wait until Cloudflare shows **Active**.
4. (Later) Add Render custom domain CNAME/A as in `SOFT_LAUNCH_OPS.md`.

### B. Receive mail: Cloudflare Email Routing

1. Cloudflare → **Email** → **Email Routing** → enable.
2. Add destination address = your personal inbox (verify the confirmation email).
3. Create custom addresses:
   - `dorian@watchify.app` → your personal inbox (founder / contact / admin — primary)
   - `nicole@watchify.app` → Nicole’s inbox (or shared destination) — additional team address
   - `hello@watchify.app` → same as dorian (optional alias for brand From)
4. Cloudflare will ask you to add MX + TXT records — accept their suggested records (do **not** also point MX at Google/Microsoft unless you switch fully later).

You can reply from Gmail using “Send mail as” if you want replies to appear from `dorian@watchify.app` (Gmail → Settings → Accounts → Send mail as). Or reply from personal mail and set Reply-To in your head — for soft launch, forwarding alone is fine.

### C. Send mail: verify domain in Resend

1. Sign up at [resend.com](https://resend.com/) → **Domains** → **Add** `watchify.app`.
2. Add the DNS records Resend shows (typically):
   - **SPF** — TXT on root or `send` subdomain (Resend provides exact value)
   - **DKIM** — CNAME(s) Resend provides
   - **DMARC** — start with `v=DMARC1; p=none; rua=mailto:dorian@watchify.app` on `_dmarc.watchify.app`
3. Wait until Resend shows domain **Verified**.
4. Create API key → set on Render **watchify-web** as `RESEND_API_KEY` (never commit).
5. Set env (local + Render):

```env
RESEND_API_KEY=re_...          # dashboard secret only
EMAIL_FROM=Watchify <hello@watchify.app>
CONTACT_EMAIL=dorian@watchify.app
SUPPORT_EMAIL=dorian@watchify.app
ADMIN_EMAIL=dorian@watchify.app
NICOLE_EMAIL=nicole@watchify.app
VAPID_SUBJECT=mailto:dorian@watchify.app
```

6. Redeploy **watchify-web**. Confirm `/api/health` reports email transport `resend`.
7. Sign up a throwaway account and confirm the verification email arrives From `hello@watchify.app`.

### D. Optional: SMTP instead of Resend

If you prefer Nodemailer + provider SMTP:

```env
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Watchify <hello@watchify.app>
```

Leave `RESEND_API_KEY` unset so transport picks SMTP. Same SPF/DKIM/DMARC discipline applies at that provider.

### E. Optional later: Google Workspace / Microsoft 365

Only if you want a real hosted mailbox (IMAP/web UI) instead of forwarding:

1. Buy Workspace or M365 for `watchify.app`.
2. Replace Cloudflare Email Routing MX with Google/Microsoft MX (cannot run both as primary).
3. Create user `dorian@watchify.app`.
4. Keep Resend for app transactional send (still verify domain / SPF include Resend).

---

## Env vars (summary)

| Variable | Example | Purpose |
|----------|---------|---------|
| `EMAIL_FROM` | `Watchify <hello@watchify.app>` | From header for verify/reset/reminders |
| `CONTACT_EMAIL` | `dorian@watchify.app` | `/contact`, footer mailto |
| `SUPPORT_EMAIL` | `dorian@watchify.app` | Alias; falls back to CONTACT/ADMIN |
| `ADMIN_EMAIL` | `dorian@watchify.app` | Founder / ops contact |
| `NICOLE_EMAIL` | `nicole@watchify.app` | Additional team address (not primary contact) |
| `RESEND_API_KEY` | *(secret)* | Enables Resend transport |
| `VAPID_SUBJECT` | `mailto:dorian@watchify.app` | Web Push contact URI |
| `SMTP_*` | optional | Alternate transport if no Resend |

Demo seed logins (`alex@watchify.app`, etc.) stay **fake local accounts** for soft-launch testing — they are not real mailboxes.

---

## DNS checklist (copy/paste mental model)

After cutover you should have roughly:

- **NS** → Cloudflare (or your registrar DNS you control)
- **MX** → Cloudflare Email Routing *or* Google/Microsoft (not both as primary)
- **TXT SPF** → includes Resend (and/or Google) as authorized senders
- **DKIM** → Resend CNAMEs (and Google if Workspace)
- **DMARC** → `_dmarc` TXT, start with `p=none`, tighten later

---

## Related

- [SOFT_LAUNCH_OPS.md](./SOFT_LAUNCH_OPS.md) — Render / Neon / TURN
- [SOFT_LAUNCH.md](./SOFT_LAUNCH.md) — product checklist
- [README.md](../README.md) — local email transport order

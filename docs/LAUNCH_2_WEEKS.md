# Watchify — 2-week launch (billion-dollar wedge)

## Honest framing

In **14 days** we cannot ship native Fire TV / Apple TV apps, studio licenses, and a mature SFU mesh.  
We *can* ship the **category-defining wedge**: the social OS above every streamer — presence, 1-tap parties, taste graph, real billing, production ops — so early users feel the billion-dollar product, not a demo.

**Launch thesis:** Be the only place where friends follow what you’re watching *across* services, and one link starts tonight’s party.

## Definition of Done (Day 14)

Must be true for every tester:

| Pillar | Done means |
|--------|------------|
| **Ops** | HTTPS prod URL, Postgres, Next + realtime supervised, backups, `/api/health` green |
| **Money** | Stripe Checkout + portal + webhook; no “demo activate” in prod |
| **Auth** | Email verify + reset via Resend/SMTP; OAuth optional |
| **Viral** | Invite link → signed-out preview → auth → join → first chat in &lt;60s |
| **Presence** | 1-tap share watching; friends see it live on Discover/Feed |
| **Party** | Free title sync + own-account sync + face video (TURN) works on 2 devices |
| **Mobile** | Installable PWA; companion/TV lean-back mode usable on phone + living-room browser |
| **Trust** | Mod queue, bans, reports; no piracy claims; CC attribution intact |
| **Graph** | For You + compatible friends from real activity (not only seed) |

**Out of scope for Day 14 (Week 3–8 roadmap):** native TV store apps, AVOD partner deals, SFU &gt;6 video, studio licensing.

## Calendar

### Week 1 — Make it real (ops + money + viral)

| Day | Focus |
|-----|--------|
| **1** | Domain + deploy (Railway/Fly/Render or VPS). Postgres. Secrets. Health checks. |
| **2** | Stripe test → live path; webhook; Customer Portal. Kill prod demo grants. |
| **3** | Resend email verify/reset. TMDB key for live providers. Production TURN. |
| **4** | Invite conversion UX: OG cards, post-join “invite 2 friends,” copy that converts. |
| **5** | Soft-launch script with 5 friends; fix every friction &gt;10s. |
| **6–7** | Bug bash + analytics funnel review; harden rate limits / bans. |

### Week 2 — Make it inevitable (graph + screens + growth)

| Day | Focus |
|-----|--------|
| **8** | PWA install + companion lean-back (`/tv`) for couch use. |
| **9** | Presence friction → 1-tap from Watching dock; share sheet defaults. |
| **10** | Taste graph polish: empty states → “invite friends” CTAs; host streaks. |
| **11** | 10–20 person soft launch; capture NPS + “would invite?” |
| **12** | Fix top 5 issues; onboarding for new hosts. |
| **13** | Marketing site pulse + press kit one-pager; waitlist if needed. |
| **14** | Go / no-go. Launch publicly if DoD met; else 48h slip with named blockers. |

## Owner checklist (you)

Keys/accounts you must create (agent cannot invent):

- [ ] Domain + DNS  
- [ ] Postgres provider  
- [ ] Stripe account (products Plus + Party)  
- [ ] Resend (or SMTP)  
- [ ] TMDB API key  
- [ ] TURN provider (Twilio / Metered / Cloudflare)  
- [ ] Optional: Google/GitHub OAuth, Trakt, PostHog  

## Success metrics (first 14 days post-launch)

- Invite → join conversion ≥ 35%  
- Party with ≥2 people ≥ 40% of created rooms  
- D1 return ≥ 25% of joiners  
- ≥1 organic invite chain of depth 2 (A invites B invites C)

## Moat reminder

Catalogs are commodities. **Cross-service social identity** is the moat. Every feature this fortnight either densifies the graph or removes friction from Watch → Share → Invite → Party.

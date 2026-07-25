# Filmhub meeting brief — Watchify

**Meeting:** Tuesday, Jul 28, 2026 · **1:00 PM** America/Los_Angeles (PDT)  
**Contact:** Dorian · `dorian@watchify.app`  
**Product live (soft launch):** https://watchify-web-9rx1.onrender.com  
**Public licensing stance:** [/content](https://watchify-web-9rx1.onrender.com/content) · [VISION.md](../VISION.md)

---

## 1. Pitch (for a content aggregator / licensor)

Watchify is the **social layer for watching together** — parties with chat, face video, and presence across the streamers people already pay for, plus a **legal in-app Free library** with real synced playback. Catalogs are commoditized; our wedge is co-viewing and taste, not another closed SVOD app. Paid titles stay **own-account + deep links** (never scraped or proxied). Hosted Free titles are where we need **cleared AVOD/SVOD windows** so parties can actually press play together. Filmhub sits on our published content ladder (PD/CC → trailers → AVOD partners → **aggregators** → studios). A small licensed slate turns soft-launch party nights from demo shorts into a real indie catalog — without competing with Netflix inside our player.

---

## 2. What Watchify wants from Filmhub

| Ask | Preference |
|-----|------------|
| **Rights** | AVOD and/or SVOD for **in-app** playback in Watchify Free (and optionally Plus / Party as a paid window later) |
| **Use case** | Solo watch + **party sync** (shared play/pause/seek) — social co-viewing is the product |
| **Geography** | **US first**; option to expand later |
| **Term** | Short pilot (e.g. 6–12 months) with renewal on performance |
| **Exclusivity** | **Non-exclusive preferred** early — we are not asking for exclusive windows |
| **Slate** | Curated **20–50** titles for soft launch (features + strong shorts OK); quality > volume |
| **Commercial** | Revenue share preferred over large MG for pilot; open to modest MG if slate warrants |
| **Delivery** | Streamable assets + metadata + artwork we can host or pull via agreed CDN/HLS |
| **Kids** | Clarity on G/PG / kids-safe vs adult; we need age labeling for parties |

---

## 3. What Watchify will **not** ask for

- Netflix / Max / Disney+ (etc.) **catalog scraping**, DRM ripping, or credential sharing  
- Redistributing **other platforms’ SVOD streams** to non-subscribers  
- Claiming “free Netflix” or that social follow = watching the film  
- Screen-sharing paid streamer apps inside parties  
- Exclusive global rights or a massive day-one library  

We already deep-link to paid services; Filmhub titles would be **legally hosted on Watchify**, separate from that mode.

---

## 4. Smart questions for Filmhub

1. **Commercial:** Typical rev-share splits for AVOD vs SVOD on a social/co-view app? Floor / caps? Payment cadence?  
2. **MG / advances:** Minimum guarantees for a 20–50 title pilot vs pure rev-share?  
3. **Rights packages:** Which titles have US AVOD vs SVOD vs both? Theatrical/TVOD holdbacks we must respect?  
4. **Delivery specs:** Mezzanine format? HLS / DASH packages? Codec, bitrate ladders, closed captions / audio tracks?  
5. **Hosting:** Do you provide CDN URLs, or do we ingest and encode? Watermarking / forensic requirements?  
6. **Metadata:** XML/JSON/API? Required fields (title, year, runtime, genres, rating, synopsis, cast)? Update cadence?  
7. **Artwork:** Poster / backdrop / stills rights and dimensions? Co-branding or Filmhub credit requirements?  
8. **Reporting:** What view / complete / geography reports do you need (daily/monthly)? Ad impressions if AVOD?  
9. **Content ID / anti-piracy:** Fingerprinting, mirror detection, or partner Content ID workflows?  
10. **DMCA / disputes:** Who owns takedown process when a rights conflict appears?  
11. **Kids / ratings:** How are kids and mature titles labeled? Any titles we must gate or exclude from Free?  
12. **Takedown SLA:** Target hours for geo/rights pull? Process for temporary vs permanent removal?  
13. **Party / multi-viewer:** Any license language issues with simultaneous co-viewers on one licensed stream vs N seats?  
14. **Plus / paid window:** Path to upgrade a Free AVOD title to Plus SVOD later without re-clearing?

---

## 5. Technical readiness — have vs gaps

### Already in product

| Capability | Status |
|------------|--------|
| In-app **Free player** | Progressive **MP4** + YouTube + Archive.org embeds (`FreePlayer`) |
| **Party sync** for Free titles | Play / pause / seek via realtime (~1s) |
| **Attribution** UI | Creator / license / source on Free library titles |
| Catalog + Discover / Library UX | Free shelf + deep-link catalog for paid services |
| Social stack | Parties, chat, presence, face video (WebRTC + TURN), invites |
| Soft moderation | User reports, `/admin/reports`, upload keyword/MIME checks |
| Public legal story | `/content` matches Vision ladder (Filmhub named as aggregator step) |

### Gaps before a Filmhub slate ships

| Gap | Why it matters |
|-----|----------------|
| **HLS / DASH player** | Distributor delivery is usually ABR packages, not single MP4s |
| **Watchify CDN / ingest** | Need durable hosting (not hotlinked third-party MP4s) |
| **Licensed-title CMS** | Rights window, geo, license kind, expiry — not just CC/PD flags |
| **Playback + geography reporting** | Partner statements; US-first geo checks |
| **Ad stack (AVOD)** | Not built yet — SVOD/rev-share or deferred ads may be easier for pilot |
| **Full DMCA / Content ID ops** | Soft-launch queue ≠ studio-grade notice-and-takedown + fingerprinting |
| **Kids gating** | Ratings exist loosely; need explicit Free vs Plus / age gates |
| **Plus as SVOD catalog** | Plus today = lists/social links, **not** a licensed paid catalog — product/copy must catch up if we sell SVOD |

**Honest line for the call:** “We can party-sync Free titles today on progressive media; for your slate we’d add HLS ingest + reporting to your specs on a pilot timeline.”

---

## 6. Suggested deal shape (soft launch)

- **Pilot slate:** **20–50** cleared titles (mix of watchable features + a few party-friendly shorts)  
- **Model:** **Revenue share**, US **AVOD-first** or light SVOD on Plus if ads aren’t ready  
- **Territory:** **United States only** at start  
- **Exclusivity:** **Non-exclusive**  
- **Term:** 6–12 months pilot → renew / expand on completion rate + party starts  
- **MG:** Prefer **$0 or token** MG; discuss only if Filmhub requires it for stronger titles  
- **Success metrics (ours):** Free library starts, party creates on licensed titles, completion %, invite→join conversion  
- **Phase 2:** More titles, CA/UK, AVOD ads, optional Plus window  

---

## 7. 30-minute agenda

| Min | Topic |
|-----|--------|
| 0–3 | Intros + Watchify one-liner (social layer + legal Free sync) |
| 3–8 | Product demo narrative: Free party sync vs own-account deep links (no scrape) |
| 8–14 | Ask: pilot slate, AVOD/SVOD, US, non-exclusive, rev-share |
| 14–22 | Their questions + delivery / metadata / reporting / kids / takedown |
| 22–27 | Technical readiness + realistic ingest timeline |
| 27–30 | Next steps: sample title list, term sheet outline, follow-up owner |

---

## 8. One-pager talking points (glance during the call)

**Who we are**  
Social watch-together app — parties, chat, faces, cross-service presence. Not “another Netflix.”

**Why Filmhub**  
We need **cleared in-app titles** so Free parties are real. Aggregators are step 4 on our ladder after PD/CC.

**The ask**  
Small **US, non-exclusive** pilot · **20–50 titles** · **AVOD and/or SVOD** · **rev-share** · short term.

**The don’t-ask**  
No scraping or redistributing Netflix/etc. streams. Paid apps stay deep-link + own login.

**Proof we can play**  
Free library + party playhead sync already live; licensed slate needs HLS/CDN/reporting polish.

**Commercial posture**  
Start small, measure party usage, expand. Prefer share over big MG.

**Close**  
“Send a sample slate + delivery sheet; we’ll reply with ingest plan and pilot term preferences.”

---

## Pre-call checklist (Dorian)

- [ ] Soft-launch URL + one Free party title bookmarked for verbal demo  
- [ ] `/content` open in a tab (shows Filmhub on the ladder)  
- [ ] Notes doc for slate size, AVOD vs SVOD, MG, delivery owner  
- [ ] Calendar: **Tue Jul 28, 2026 · 1:00 PM PDT**

*Internal only — no commit required for this doc.*

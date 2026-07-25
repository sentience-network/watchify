# Watchify mobile — web, PWA, native iOS screen share

**Live:** https://watchify-web-9rx1.onrender.com

## Status (honest)

| Layer | Status |
|-------|--------|
| **Mobile web** | Primary. Responsive shell, bottom tabs, safe-area padding, installable. |
| **PWA “app”** | Soft-launch mobile app. Manifest `standalone`, service worker shell cache, install banner (Chrome) + iOS A2HS guide, branded icons. |
| **iOS native (ReplayKit)** | **Scaffolded** under `native/ios` + web bridge. Full device screen share for TikTok-style parties requires this shell. Compile/sign on a **Mac with Xcode** (not possible on Windows alone). |
| **App Store / Play** | **Not shipped.** Capacitor config + Broadcast Extension sources are in-repo; store listing / IAP / APNs not started. |

## Install on a phone (testers)

### iPhone / iPad (Safari)

1. Open https://watchify-web-9rx1.onrender.com in **Safari** (not in-app browsers).
2. Tap **Share** (square with ↑).
3. Scroll → **Add to Home Screen** → **Add**.
4. Open the **Watchify** icon — it runs fullscreen (standalone).

**Screen share:** Safari / PWA **cannot** capture other apps into WebRTC. You will see an honest message plus **Open in Watchify iOS app**. Host TikTok parties from the native iOS build, Android Chrome, or desktop.

### Android (Chrome)

1. Open the site in **Chrome**.
2. Tap the **Install** banner when shown, **or** menu (⋮) → **Install app** / **Add to Home screen**.
3. Open from the home screen / app drawer.

Settings → **Mobile app (PWA)** repeats these steps in-product.

## What works today

- Discover / Parties / guest join / party room / Now Watching / bottom nav / Settings on phone viewports
- Add to Home Screen → standalone display mode
- Offline fallback page for shell navigations when the network is down
- Push reminder opt-in (when VAPID configured) via the same service worker
- **Android Chrome screen parties:** host taps **Share screen** in the party video room (`getDisplayMedia`), then switches to TikTok / Shorts / Reels (or free/owned media). Viewers see the host capture + chat/faces. Soft-capped at 6 video peers; uses more battery/data — prefer Wi‑Fi.
- **iOS native screen parties (when built on Mac):** host opens the party in the Watchify iOS app, taps **Share Screen (iOS)**, starts the ReplayKit broadcast for **Watchify**, switches to TikTok / Shorts / Reels. Frames relay App Group → JS `canvas.captureStream` → existing WebRTC mesh.

## Gaps / weak spots

- Native store listing, IAP, push via APNs/FCM store channels — not started
- Cold start on free Render still hurts first open on cellular
- Face video / WebRTC quality varies by mobile network. Production uses **Metered TURN** (`GET /api/realtime/ice`); still not a native SFU app
- **iOS Safari / PWA screen share:** Apple does not expose full-device `getDisplayMedia` to websites. Plain Safari stays honest (no fake button). Use the native app, Android Chrome, or desktop.
- System audio with screen share is best-effort (Chrome often includes it; iOS v1 bridge is video frames + optional party mic).
- JPEG/App Group bridge is ~12–15 fps @ ≤720px wide — fine for TikTok co-watch, not 4K desktop mirroring.

## Test a TikTok-style screen party (Android)

1. On a computer or second phone, open the party invite and join chat + video.
2. On **Android Chrome** (not an in-app browser), host creates a party with mode **TikTok / screen party** (or any party), opens the focus room, taps **Share screen**.
3. Allow capture; pick this screen or a tab; switch to TikTok (or Shorts/Reels). Keep Watchify in the background.
4. Confirm the guest sees the shared screen large, with compact face tiles + chat.
5. Tap **Stop sharing** / browser stop; try **Reconnect** if ICE drops. Do **not** share Netflix/Max/etc. paid apps.

### Strict NAT / cellular video smoke test

1. Two devices on **different networks** (e.g. home Wi‑Fi + phone cellular, or two phones on different carriers). Same LAN often works with STUN alone and won’t prove TURN.
2. Both join the same party video room (camera optional). Confirm faces/screen appear within ~10s.
3. On desktop Chrome: `chrome://webrtc-internals` → look for `relay` candidates / `turn:` allocations (proves TURN was used).
4. If video fails only across networks: check live `/api/config` → `turnEnvConfigured: true`, then signed-in `/api/realtime/ice` → `provider: "metered"` (see [`SOFT_LAUNCH_OPS.md`](./SOFT_LAUNCH_OPS.md)).

## Test a TikTok-style screen party (iPhone — native app)

Requires a Mac build of `native/ios` installed on a physical iPhone (see below).

1. Guest joins the party from any device (Safari OK for viewers).
2. Host opens the **Watchify iOS app** (not Safari), joins the same party video room.
3. Tap **Share Screen (iOS)** → system broadcast picker → start **Watchify** broadcast.
4. Switch to TikTok / Shorts / Reels (or free/owned media). Red status bar = broadcasting.
5. Guest should see the host screen in the party room. Stop via Control Center / status bar or **Stop sharing** in-app.
6. Paid streamer apps remain blocked by product policy — do not share Netflix/Max/etc.

### Plain Safari vs native app

| Surface | Host screen share |
|---------|-------------------|
| iOS Safari / PWA | Unavailable — message + “Open in Watchify iOS app” + camera/upload/TV alts |
| Watchify iOS app (ReplayKit) | **Share Screen (iOS)** → broadcast picker → WebRTC |
| Android Chrome | **Share screen** via `getDisplayMedia` |
| Desktop Chrome/Edge/Firefox | **Share screen** via `getDisplayMedia` |

## Build / run iOS app (Mac + Xcode required)

This repo is often edited on Windows. **Final compile, signing, and device install must happen on a Mac.**

### Option A — Thin WKWebView host (fastest scaffold)

```bash
brew install xcodegen   # once
cd watchify/native/ios
xcodegen generate
open Watchify.xcodeproj
```

In Xcode:

1. Select the **Watchify** app target → Signing & Capabilities → your Team.
2. Repeat for **WatchifyBroadcast**.
3. Confirm **App Groups** capability includes `group.com.watchify.app` on **both** targets (create the group in the Apple Developer portal if needed).
4. Run on a **physical iPhone** (Simulator does not fully support ReplayKit broadcast to other apps).

Sources:

- `App/` — WKWebView host + `window.WatchifyNative.screenShare` bridge
- `WatchifyBroadcast/` — ReplayKit Broadcast Upload Extension (`SampleHandler`)
- `Shared/ScreenFrameRelay.swift` — App Group JPEG + Darwin notifications

### Option B — Capacitor shell (store-oriented)

```bash
cd watchify/native
npm install
# On a Mac:
npx cap add ios
# Wire Broadcast Extension + Shared sources into the generated Xcode project
# (copy WatchifyBroadcast + Shared, match bundle IDs / App Group)
# Add plugin from plugins/watchify-screen-share
npx cap sync ios
npx cap open ios
```

`capacitor.config.ts` points the WebView at production (override with `CAPACITOR_SERVER_URL` for LAN Next.js).

Web detection lives in `src/lib/ios-screen-share.ts` and works with either:

- `window.WatchifyNative.screenShare` (thin host), or
- `Capacitor.Plugins.WatchifyScreenShare`

### App Store / ReplayKit notes

- Broadcast Upload Extension uses `com.apple.broadcast-services-upload` and sample-buffer mode.
- App Group (`group.com.watchify.app`) must be enabled for the app **and** the extension under the same Team.
- Bundle IDs: `com.watchify.app` + `com.watchify.app.Broadcast` (change if you own a different prefix — update web constants / plugin prefs too).
- Review: screen capture apps should explain purpose (watch parties / co-view social apps). Do **not** claim to bypass DRM or rebroadcast paid streamers — Watchify policy already blocks that.
- Apple Developer Program (~$99/yr) required for device + TestFlight / App Store.
- Optional env for soft-launch CTAs: `NEXT_PUBLIC_WATCHIFY_IOS_TESTFLIGHT_URL`, `NEXT_PUBLIC_WATCHIFY_IOS_STORE_URL`.

**Cost note:** Capacitor OSS is $0; Apple Developer and Play Console are not.

## Architecture (iOS screen → party WebRTC)

```
Other apps (TikTok, …)
        │  ReplayKit CMSampleBuffer
        ▼
Broadcast Upload Extension (WatchifyBroadcast)
        │  JPEG ≤720w @ ~12–15fps → App Group
        │  Darwin notify frame/started/stopped
        ▼
Main app plugin / WatchifyNativeBridge
        │  Capacitor event or CustomEvent
        ▼
Web (PartyVideoRoom)
        │  canvas.captureStream → usePartyVideo.replaceTrack
        ▼
Existing Socket.io signaling + WebRTC mesh (unchanged for viewers)
```

Until a signed iOS build is installed, ship PWA improvements and Android/desktop screen parties — they remain the soft-launch path.

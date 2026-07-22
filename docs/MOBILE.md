# Watchify mobile — web, PWA, native stores

**Live:** https://watchify-web-9rx1.onrender.com

## Status (honest)

| Layer | Status |
|-------|--------|
| **Mobile web** | Primary. Responsive shell, bottom tabs, safe-area padding, installable. |
| **PWA “app”** | Soft-launch mobile app. Manifest `standalone`, service worker shell cache, install banner (Chrome) + iOS A2HS guide, branded icons. |
| **App Store / Play** | **Not shipped.** No Capacitor/RN binary in repo. Prefer a solid PWA for soft launch over a half-broken native shell. |

## Install on a phone (testers)

### iPhone / iPad (Safari)

1. Open https://watchify-web-9rx1.onrender.com in **Safari** (not in-app browsers).
2. Tap **Share** (square with ↑).
3. Scroll → **Add to Home Screen** → **Add**.
4. Open the **Watchify** icon — it runs fullscreen (standalone).

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

## Gaps / weak spots

- Native store listing, IAP, push via APNs/FCM store channels — not started
- Cold start on free Render still hurts first open on cellular
- Face video / WebRTC quality varies by mobile network (TURN helps; not a native SFU app)

## Capacitor / store builds (next, when ready)

Do **not** scaffold Capacitor until you have Apple Developer + Google Play accounts and a paid always-on host. Rough free-tooling path:

```bash
# From watchify/ — after deciding to wrap the live URL or a static export
npm i -D @capacitor/cli
npx cap init Watchify com.watchify.app --web-dir=out   # or point server.url at production
npm i @capacitor/core @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

Then open Xcode / Android Studio, set icons splash from `public/icons`, point WebView at `https://watchify-web-9rx1.onrender.com` (or ship a static export), and follow store review for WebView apps.

**Cost note:** Capacitor OSS is $0; Apple Developer (~$99/yr) and Play Console (~$25 one-time) are not.

Until then, ship PWA improvements — they are the soft-launch mobile app.

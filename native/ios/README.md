# Watchify iOS — ReplayKit screen share shell

Sources for a **thin WKWebView host** (no Capacitor required) plus a Broadcast
Upload Extension. Prefer Capacitor for store builds; see `docs/MOBILE.md`.

## Generate Xcode project (Mac)

```bash
brew install xcodegen   # once
cd native/ios
xcodegen generate
open Watchify.xcodeproj
```

Then in Xcode:

1. Set **Team** / signing for `Watchify` and `WatchifyBroadcast`.
2. Confirm App Group `group.com.watchify.app` on both targets (Developer portal).
3. Embed the Broadcast extension (XcodeGen already declares the dependency).
4. Run on a **physical iPhone** (ReplayKit broadcast is limited in Simulator).

## Capacitor path

From `watchify/native/`:

```bash
npm install
npx cap add ios          # once, on a Mac
# Copy Shared + WatchifyBroadcast into the Capacitor ios project
# Register WatchifyScreenShare plugin (see docs/MOBILE.md)
npx cap sync ios
npx cap open ios
```

## Architecture

```
[TikTok / other apps]
        │ ReplayKit sample buffers
        ▼
WatchifyBroadcast (Upload Extension)
        │ JPEG + Darwin notify via App Group
        ▼
Main app (WKWebView / Capacitor)
        │ window.WatchifyNative / Capacitor plugin events
        ▼
Web: canvas.captureStream → usePartyVideo WebRTC mesh
```

/**
 * Browser media capability helpers for party video / screen share.
 * Prefer feature detection over UA sniffing; use UA only for honest UX copy.
 *
 * iOS: getDisplayMedia is generally unavailable in Safari/PWA. Real device
 * screen share requires the Watchify iOS app (ReplayKit Broadcast Extension).
 */

export type ScreenShareCapability = {
  /** True when navigator.mediaDevices.getDisplayMedia exists. */
  supported: boolean;
  /**
   * True when the user can start a screen share somehow:
   * web getDisplayMedia OR native iOS ReplayKit bridge.
   */
  canShare: boolean;
  /** Native Watchify iOS shell + Broadcast Extension bridge present. */
  nativeIosBridge: boolean;
  /** Likely iOS (iPhone/iPad) — used for guidance, not as the support gate. */
  isIos: boolean;
  /** Likely Safari on iOS (includes standalone PWA). */
  isIosSafari: boolean;
  /** Likely Android (Chrome/WebView shells). */
  isAndroid: boolean;
  /** Short reason when unsupported (no web API and no native bridge). */
  unsupportedReason: string;
  /** Soft tip for mobile hosts (battery / data / permission UX). */
  mobileHostTip: string;
};

function readUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

/** iPhone / iPod / iPad (incl. iPadOS desktop-UA with touch). */
export function isLikelyIos(ua = readUserAgent()): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ may report as MacIntel with touch
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/** Safari (or standalone WebKit) on iOS — not Chrome/Firefox/Edge iOS shells. */
export function isLikelyIosSafari(ua = readUserAgent()): boolean {
  if (!isLikelyIos(ua)) return false;
  const webkit = /WebKit/.test(ua);
  // iOS third-party browsers still use WebKit; distinguish via CriOS/FxiOS/etc.
  const otherShell = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return webkit && !otherShell;
}

/** Android phone/tablet UA. */
export function isLikelyAndroid(ua = readUserAgent()): boolean {
  return /Android/i.test(ua);
}

/** Feature-detect display capture (screen / window / tab share). */
export function supportsDisplayMedia(
  mediaDevices: Pick<MediaDevices, "getDisplayMedia"> | null | undefined =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined
): boolean {
  return typeof mediaDevices?.getDisplayMedia === "function";
}

export function getScreenShareCapability(
  opts: {
    mediaDevices?: Pick<MediaDevices, "getDisplayMedia"> | null;
    userAgent?: string;
    /** When true, Watchify iOS native ReplayKit bridge is available. */
    nativeIosBridge?: boolean;
  } = {}
): ScreenShareCapability {
  const ua = opts.userAgent ?? readUserAgent();
  const media =
    opts.mediaDevices !== undefined
      ? opts.mediaDevices
      : typeof navigator !== "undefined"
        ? navigator.mediaDevices
        : undefined;
  const supported = supportsDisplayMedia(media);
  const nativeIosBridge = Boolean(opts.nativeIosBridge);
  const isIos = isLikelyIos(ua);
  const isIosSafari = isLikelyIosSafari(ua);
  const isAndroid = isLikelyAndroid(ua);
  const canShare = supported || nativeIosBridge;

  let unsupportedReason = "";
  if (!canShare) {
    if (isIos) {
      unsupportedReason =
        "iPhone and iPad browsers cannot capture other apps — Apple does not expose full device screen capture (getDisplayMedia) to websites. Open this party in the Watchify iOS app to share via ReplayKit, or host from Android Chrome / desktop / TV.";
    } else if (isAndroid) {
      unsupportedReason =
        "This Android browser does not support screen capture. Open the party in Chrome (not an in-app browser) and try again.";
    } else {
      unsupportedReason =
        "This browser does not support screen capture (getDisplayMedia). Try Chrome, Edge, or Firefox on a desktop, laptop, or Android phone.";
    }
  }

  let mobileHostTip = "";
  if (nativeIosBridge && isIos) {
    mobileHostTip =
      "Watchify iOS: tap Share Screen (iOS), start Broadcast with Watchify, then switch to TikTok / Shorts / Reels. Keep the broadcast running. Prefer Wi‑Fi — screen share uses more battery and data.";
  } else if (supported && isAndroid) {
    mobileHostTip =
      "Android Chrome: after you tap Share screen, pick this screen or a tab, allow capture, then switch to TikTok / Shorts / Reels. Keep Watchify open in the background. Screen share uses more battery and mobile data — prefer Wi‑Fi.";
  } else if (supported && !isIos) {
    mobileHostTip =
      "Share a browser tab or window of free/owned or social apps (TikTok, YouTube Shorts, Reels). Do not share paid streamer apps (Netflix, Max, etc.).";
  } else if (!canShare && isIos) {
    mobileHostTip =
      "Safari and the PWA cannot capture other apps into WebRTC. Use the Watchify iOS app (ReplayKit), or host from Android Chrome / desktop.";
  }

  return {
    supported,
    canShare,
    nativeIosBridge,
    isIos,
    isIosSafari,
    isAndroid,
    unsupportedReason,
    mobileHostTip,
  };
}

/** Soft copy shown near screen-share controls (plan + device limits). */
export const SCREEN_SHARE_SOFT_LIMITS =
  "Face video + screen share soft-capped at 6 peers (mesh). Hosting needs Party plan / trial. Expect higher battery and data use while sharing from a phone.";

/** Copy for party UI when screen share is unavailable. */
export const SCREEN_SHARE_ALTERNATIVES = [
  {
    id: "ios_app",
    title: "Open in Watchify iOS app",
    detail:
      "Full device screen share on iPhone uses ReplayKit inside the native app — not Safari. Install / open Watchify iOS, join the party, then tap Share Screen (iOS).",
  },
  {
    id: "camera",
    title: "Share your camera",
    detail:
      "Turn the camera on in the video room — peers see your face (or point it at another screen).",
  },
  {
    id: "upload",
    title: "Upload a video",
    detail:
      "Post a rights-cleared / owned file to Watchify Free, then host a sync party on that title.",
    href: "/upload",
  },
  {
    id: "desktop",
    title: "Open on Android Chrome, desktop, or TV",
    detail:
      "Screen share works in Chrome on Android and in Chrome/Edge/Firefox on a computer. Pair a living-room browser via TV mode.",
    href: "/tv",
  },
  {
    id: "mirror",
    title: "AirPlay / cast the room",
    detail:
      "AirPlay this Safari tab to an Apple TV for the big screen, or cast from a desktop / Android host that can screen-share. Browser AirPlay does not capture other apps into WebRTC.",
  },
] as const;

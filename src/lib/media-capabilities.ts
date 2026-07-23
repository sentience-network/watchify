/**
 * Browser media capability helpers for party video / screen share.
 * Prefer feature detection over UA sniffing; use UA only for honest UX copy.
 */

export type ScreenShareCapability = {
  /** True when navigator.mediaDevices.getDisplayMedia exists. */
  supported: boolean;
  /** Likely iOS (iPhone/iPad) — used for guidance, not as the support gate. */
  isIos: boolean;
  /** Likely Safari on iOS (includes standalone PWA). */
  isIosSafari: boolean;
  /** Short reason when unsupported. */
  unsupportedReason: string;
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
  const isIos = isLikelyIos(ua);
  const isIosSafari = isLikelyIosSafari(ua);

  let unsupportedReason = "";
  if (!supported) {
    if (isIos) {
      unsupportedReason =
        "iPhone and iPad Safari cannot capture the screen in a web app — Apple does not expose screen capture (getDisplayMedia) to websites.";
    } else {
      unsupportedReason =
        "This browser does not support screen capture (getDisplayMedia). Try Chrome, Edge, or Firefox on a desktop or laptop.";
    }
  }

  return {
    supported,
    isIos,
    isIosSafari,
    unsupportedReason,
  };
}

/** Copy for party UI when screen share is unavailable. */
export const SCREEN_SHARE_ALTERNATIVES = [
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
    title: "Open on desktop or TV",
    detail:
      "Screen share works in Chrome/Edge/Firefox on a computer. Pair a living-room browser via TV mode.",
    href: "/tv",
  },
  {
    id: "mirror",
    title: "AirPlay / cast the room",
    detail:
      "AirPlay this Safari tab to an Apple TV for the big screen, or cast from a desktop host that can screen-share.",
  },
] as const;

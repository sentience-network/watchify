/**
 * iOS native screen-share bridge (Capacitor / WKWebView host + ReplayKit).
 *
 * Plain Safari cannot capture the device screen for arbitrary sites — there is
 * no getDisplayMedia for other apps. Real iOS screen share requires the
 * Watchify iOS shell + Broadcast Upload Extension under native/ios.
 *
 * Protocol (either host):
 * - window.WatchifyNative.screenShare  (thin Swift WebView host)
 * - Capacitor Plugins.WatchifyScreenShare
 *
 * Frames arrive as JPEG base64 → canvas.captureStream() → WebRTC track.
 */

export const WATCHIFY_IOS_APP_SCHEME = "watchify";
export const WATCHIFY_IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_WATCHIFY_IOS_STORE_URL || "";
export const WATCHIFY_IOS_TESTFLIGHT_URL =
  process.env.NEXT_PUBLIC_WATCHIFY_IOS_TESTFLIGHT_URL || "";

type FramePayload = {
  jpegBase64: string;
  width: number;
  height: number;
  ptsMs?: number;
};

type NativeScreenShareApi = {
  isAvailable: () => Promise<boolean> | boolean;
  startBroadcast: () => Promise<{ started?: boolean } | void>;
  stopBroadcast: () => Promise<void> | void;
  addListener?: (
    event: "frame" | "started" | "stopped" | "error",
    cb: (data: FramePayload | { message?: string }) => void
  ) => Promise<{ remove: () => void }> | { remove: () => void };
};

type WatchifyNativeHost = {
  screenShare?: NativeScreenShareApi;
  platform?: string;
};

type CapacitorLike = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { WatchifyScreenShare?: NativeScreenShareApi };
};

declare global {
  interface Window {
    WatchifyNative?: WatchifyNativeHost;
    Capacitor?: CapacitorLike;
  }
}

function getNativeApi(): NativeScreenShareApi | null {
  if (typeof window === "undefined") return null;
  const thin = window.WatchifyNative?.screenShare;
  if (thin && typeof thin.startBroadcast === "function") return thin;
  const cap = window.Capacitor?.Plugins?.WatchifyScreenShare;
  if (cap && typeof cap.startBroadcast === "function") return cap;
  return null;
}

/** True when running inside Watchify iOS shell (Capacitor or thin WKWebView). */
export function isWatchifyNativeIosHost(): boolean {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  if (cap?.isNativePlatform?.() && cap.getPlatform?.() === "ios") return true;
  if (window.WatchifyNative?.platform === "ios") return true;
  if (window.WatchifyNative?.screenShare) return true;
  return false;
}

/**
 * Sync hint for first paint. Native availability is confirmed async via
 * probeNativeIosScreenShare().
 */
export function hasNativeIosScreenShareBridge(): boolean {
  return Boolean(getNativeApi());
}

export async function probeNativeIosScreenShare(): Promise<boolean> {
  const api = getNativeApi();
  if (!api) return false;
  try {
    if (typeof api.isAvailable === "function") {
      return Boolean(await api.isAvailable());
    }
    return true;
  } catch {
    return false;
  }
}

/** Deep link / install hint for plain Safari on iPhone. */
export function iosAppOpenHref(partyId?: string): string {
  if (WATCHIFY_IOS_TESTFLIGHT_URL) return WATCHIFY_IOS_TESTFLIGHT_URL;
  if (WATCHIFY_IOS_APP_STORE_URL) return WATCHIFY_IOS_APP_STORE_URL;
  const path = partyId ? `party/${encodeURIComponent(partyId)}` : "parties";
  return `${WATCHIFY_IOS_APP_SCHEME}://${path}`;
}

function decodeJpegBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Starts ReplayKit broadcast via native bridge and returns a MediaStream
 * suitable for the existing WebRTC publish path (canvas-backed video track).
 */
export async function openNativeIosScreenShareStream(): Promise<{
  stream: MediaStream;
  stop: () => Promise<void>;
}> {
  const api = getNativeApi();
  if (!api) {
    throw new Error(
      "Watchify iOS screen share requires the native app. Open this party in the Watchify iOS app."
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Could not create canvas for iOS screen capture.");
  }
  // Placeholder so captureStream has a first frame before ReplayKit starts.
  ctx.fillStyle = "#0a0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "20px sans-serif";
  ctx.fillText("Starting iOS screen share…", 24, 48);

  const stream = canvas.captureStream(20);
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    try {
      videoTrack.contentHint = "detail";
    } catch {
      /* ignore */
    }
  }

  let stopped = false;
  const removals: Array<() => void> = [];

  const onFrame = (data: FramePayload | { message?: string }) => {
    if (stopped || !("jpegBase64" in data) || !data.jpegBase64) return;
    const { jpegBase64, width, height } = data;
    if (width > 0 && height > 0) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
    const bytes = decodeJpegBase64(jpegBase64);
    const copy = Uint8Array.from(bytes);
    const blob = new Blob([copy], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  if (typeof api.addListener === "function") {
    const sub = await api.addListener("frame", onFrame);
    removals.push(() => sub.remove());
    const stopSub = await api.addListener("stopped", () => {
      videoTrack?.stop();
    });
    removals.push(() => stopSub.remove());
  } else if (typeof window !== "undefined") {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<FramePayload>).detail;
      if (detail) onFrame(detail);
    };
    window.addEventListener("watchify-ios-screen-frame", handler);
    removals.push(() =>
      window.removeEventListener("watchify-ios-screen-frame", handler)
    );
  }

  await api.startBroadcast();

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    for (const remove of removals) {
      try {
        remove();
      } catch {
        /* ignore */
      }
    }
    try {
      await api.stopBroadcast();
    } catch {
      /* ignore */
    }
    stream.getTracks().forEach((t) => t.stop());
  };

  videoTrack?.addEventListener("ended", () => {
    void stop();
  });

  return { stream, stop };
}

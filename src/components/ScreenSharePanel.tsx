"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { paidStreamerBlocked } from "@/lib/free-content";
import {
  iosAppOpenHref,
  openNativeIosScreenShareStream,
  probeNativeIosScreenShare,
} from "@/lib/ios-screen-share";
import {
  getScreenShareCapability,
  SCREEN_SHARE_ALTERNATIVES,
  type ScreenShareCapability,
} from "@/lib/media-capabilities";

/**
 * Screen share prototype for free/owned media only.
 * Hard-blocks when the user indicates a paid streaming app as the source.
 * Uses getDisplayMedia when present; iOS native ReplayKit when in-app;
 * never shows a broken start button on plain iOS Safari.
 */
export function ScreenSharePanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("watchify_free");
  const streamRef = useRef<MediaStream | null>(null);
  const nativeStopRef = useRef<(() => Promise<void>) | null>(null);
  const [capability, setCapability] = useState<ScreenShareCapability | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setCapability(getScreenShareCapability({ nativeIosBridge: false }));
    void probeNativeIosScreenShare().then((nativeIosBridge) => {
      if (!cancelled) {
        setCapability(getScreenShareCapability({ nativeIosBridge }));
      }
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void nativeStopRef.current?.();
    };
  }, []);

  async function start() {
    setError("");
    if (paidStreamerBlocked(sourceLabel) || sourceLabel === "paid_streamer") {
      setError(
        "Blocked: Watchify does not allow screen-sharing paid apps like Netflix, Disney+, Hulu, Max, etc. That would redistribute copyrighted streams. Use own-account sync parties or Watchify free titles instead."
      );
      return;
    }
    const hasDisplay =
      typeof navigator.mediaDevices?.getDisplayMedia === "function";
    try {
      let stream: MediaStream;
      if (hasDisplay) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        const native = await openNativeIosScreenShareStream();
        nativeStopRef.current = native.stop;
        stream = native.stream;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setActive(false);
        streamRef.current = null;
        void nativeStopRef.current?.();
        nativeStopRef.current = null;
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "NotSupportedError") {
        setError(
          "Screen share is not supported on this device. Use camera share in a party, upload a video, or open on desktop/TV."
        );
      } else if (
        reason instanceof Error &&
        /iOS app|native/i.test(reason.message)
      ) {
        setError(reason.message);
      } else if (!hasDisplay) {
        setError(
          capability?.unsupportedReason ||
            "Screen share is not supported in this browser."
        );
      } else {
        setError("Screen share canceled or denied.");
      }
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void nativeStopRef.current?.();
    nativeStopRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

  const supported =
    capability?.canShare === true || capability?.supported === true;

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-4">
      <h3 className="font-display text-lg font-semibold text-white">
        Screen share preview
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-mist/75">
        Local preview for policy checks. To share with party members, join a
        party video room (or start a Screen / TikTok party) and use Share
        screen — that path fans out over WebRTC. Host capture of social apps is
        allowed; paid streamer windows stay blocked. Watchify does not proxy
        TikTok or Netflix CDNs.
      </p>
      {capability && !supported ? (
        <div
          className="mt-3 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5"
          role="status"
        >
          <p className="text-xs font-medium text-amber-soft">
            Screen capture unavailable on this device
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mist/85">
            {capability.unsupportedReason}
          </p>
          {capability.isIos ? (
            <a
              href={iosAppOpenHref()}
              className="mt-2 inline-flex rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
            >
              Open in Watchify iOS app
            </a>
          ) : null}
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-mist/85">
            {SCREEN_SHARE_ALTERNATIVES.filter((a) => a.id !== "camera").map(
              (alt) => (
                <li key={alt.id}>
                  <span className="font-medium text-white">{alt.title}</span>
                  {" — "}
                  {alt.detail}
                  {"href" in alt && alt.href ? (
                    <>
                      {" "}
                      <Link
                        href={alt.href}
                        className="text-teal-soft underline underline-offset-2"
                      >
                        Open
                      </Link>
                    </>
                  ) : null}
                </li>
              )
            )}
            <li>
              <span className="font-medium text-white">Camera in party</span>
              {" — "}
              Join a party video room and turn the camera on (works on iPhone).
            </li>
          </ul>
        </div>
      ) : (
        <>
          <label className="mt-3 block text-xs text-mist">
            What are you sharing?
            <select
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm text-white"
            >
              <option value="watchify_free">Watchify free / CC title</option>
              <option value="own_file">My own downloaded / owned file</option>
              <option value="social_app">
                Social app (TikTok / Shorts / Reels / similar)
              </option>
              <option value="trailer_tab">Official trailer tab</option>
              <option value="paid_streamer">
                Paid app (Netflix / Disney+ / …) — blocked
              </option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {!active ? (
              <button
                type="button"
                onClick={start}
                className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
              >
                {capability?.nativeIosBridge
                  ? "Start screen share (iOS)"
                  : "Start screen share"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
              >
                Stop
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="mt-2 text-sm text-amber-soft">{error}</p>}
      <video
        ref={videoRef}
        className={`mt-3 aspect-video w-full rounded-xl bg-black ${
          active ? "block" : "hidden"
        }`}
        muted
        playsInline
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { paidStreamerBlocked } from "@/lib/free-content";
import {
  getScreenShareCapability,
  SCREEN_SHARE_ALTERNATIVES,
  type ScreenShareCapability,
} from "@/lib/media-capabilities";

/**
 * Screen share prototype for free/owned media only.
 * Hard-blocks when the user indicates a paid streaming app as the source.
 * Uses getDisplayMedia feature detection — never shows a broken start button
 * on iOS Safari where display capture is unavailable.
 */
export function ScreenSharePanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("watchify_free");
  const streamRef = useRef<MediaStream | null>(null);
  const [capability, setCapability] = useState<ScreenShareCapability | null>(
    null
  );

  useEffect(() => {
    setCapability(getScreenShareCapability());
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
    if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
      setError(
        capability?.unsupportedReason ||
          "Screen share is not supported in this browser."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setActive(false);
        streamRef.current = null;
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "NotSupportedError") {
        setError(
          "Screen share is not supported on this device. Use camera share in a party, upload a video, or open on desktop/TV."
        );
      } else {
        setError("Screen share canceled or denied.");
      }
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

  const supported = capability?.supported === true;

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-4">
      <h3 className="font-display text-lg font-semibold text-white">
        Screen share (free / owned media only)
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-mist/75">
        Local preview for free/owned media policy checks. To share with party
        members, join a party video room and use Share screen with party — that
        path fans out over WebRTC. Paid streamer windows stay blocked.
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
              <option value="trailer_tab">Official trailer tab</option>
              <option value="paid_streamer">
                Paid app (Netflix / Disney+ / …)
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
                Start screen share
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

"use client";

import { useEffect, useRef, useState } from "react";
import { paidStreamerBlocked } from "@/lib/free-content";

/**
 * Screen share prototype for free/owned media only.
 * Hard-blocks when the user indicates a paid streaming app as the source.
 */
export function ScreenSharePanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("watchify_free");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
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
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen share is not supported in this browser.");
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
    } catch {
      setError("Screen share canceled or denied.");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

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
          <option value="paid_streamer">Paid app (Netflix / Disney+ / …)</option>
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePartyVideo } from "@/hooks/usePartyVideo";
import { track } from "@/lib/analytics-client";
import {
  getScreenShareCapability,
  SCREEN_SHARE_ALTERNATIVES,
  type ScreenShareCapability,
} from "@/lib/media-capabilities";
import { useWatchify } from "@/lib/store";
import { partyUserLabel } from "@/lib/users";

function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!stream || !enabled) {
      setSpeaking(false);
      return;
    }
    const audioTracks = stream.getAudioTracks().filter((t) => t.enabled);
    if (!audioTracks.length) {
      setSpeaking(false);
      return;
    }
    let cancelled = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (cancelled) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setSpeaking(avg > 18);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      setSpeaking(false);
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [stream, enabled]);
  return speaking;
}

function VideoTile({
  stream,
  label,
  muted,
  connection,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  connection?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const speaking = useSpeaking(stream, Boolean(stream) && !muted);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  const hasVideo = Boolean(
    stream?.getVideoTracks().some(
      (track) => track.enabled && track.readyState === "live"
    )
  );
  const weak =
    connection === "connecting" ||
    connection === "disconnected" ||
    connection === "failed" ||
    connection === "reconnecting";

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-xl border bg-ink ${
        speaking
          ? "border-teal shadow-[0_0_0_2px_rgba(45,212,191,0.45)]"
          : "border-line"
      }`}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${muted ? "-scale-x-100" : ""}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center text-sm text-mist">
          Camera off
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
        {label}
        {speaking ? " · speaking" : ""}
      </span>
      {weak ? (
        <span className="absolute right-2 top-2 rounded bg-amber/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
          {connection === "failed" ? "Weak link" : "Reconnecting"}
        </span>
      ) : null}
    </div>
  );
}

function ScreenShareAlternatives({
  capability,
  cameraOn,
  onEnableCamera,
}: {
  capability: ScreenShareCapability;
  cameraOn: boolean;
  onEnableCamera: () => void;
}) {
  return (
    <div
      className="mt-2 rounded-lg border border-line/80 bg-ink/50 px-3 py-2.5"
      role="status"
    >
      <p className="text-[11px] font-medium text-amber-soft">
        Screen share unavailable here
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mist/80">
        {capability.unsupportedReason ||
          "This browser cannot capture the display."}
      </p>
      <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-mist/85">
        {SCREEN_SHARE_ALTERNATIVES.map((alt) => (
          <li key={alt.id}>
            <span className="font-medium text-white">{alt.title}</span>
            {" — "}
            {alt.id === "camera" ? (
              cameraOn ? (
                <span>Camera is on — peers can see you.</span>
              ) : (
                <button
                  type="button"
                  onClick={onEnableCamera}
                  className="text-teal-soft underline underline-offset-2"
                >
                  Turn camera on
                </button>
              )
            ) : "href" in alt && alt.href ? (
              <>
                {alt.detail}{" "}
                <Link
                  href={alt.href}
                  className="text-teal-soft underline underline-offset-2"
                >
                  Open
                </Link>
              </>
            ) : (
              alt.detail
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PartyVideoRoom({ partyId }: { partyId: string }) {
  const video = usePartyVideo(partyId);
  const { directoryUsers } = useWatchify();
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [screenShare, setScreenShare] = useState<ScreenShareCapability | null>(
    null
  );
  const [showAlts, setShowAlts] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("watchify_video_defaults") || "{}"
      );
      setCamera(Boolean(saved.camera));
      setMicrophone(Boolean(saved.microphone));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // Client-only feature detection (not UA-only gate).
    setScreenShare(getScreenShareCapability());
  }, []);

  const peerLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const [userId, peer] of Array.from(video.peers.entries())) {
      map.set(
        userId,
        partyUserLabel(userId, directoryUsers, { name: peer.name }).name
      );
    }
    for (const userId of Array.from(video.remoteStreams.keys())) {
      if (!map.has(userId)) {
        map.set(userId, partyUserLabel(userId, directoryUsers).name);
      }
    }
    return map;
  }, [video.peers, video.remoteStreams, directoryUsers]);

  const onVideoNames = useMemo(() => {
    const you = video.joined ? ["You"] : [];
    return [...you, ...Array.from(peerLabels.values())];
  }, [video.joined, peerLabels]);

  const canScreenShare = screenShare?.supported === true;

  if (!video.joined) {
    return (
      <section
        className="mt-4 rounded-xl border border-line bg-ink/35 p-4"
        aria-labelledby={`video-${partyId}`}
      >
        <h3 id={`video-${partyId}`} className="font-semibold text-white">
          Face-to-face video · up to 6
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-mist/70">
          Free for every party member — cam/mic join does not require Party plan.
          Optional camera and microphone for people only. Nothing is recorded,
          and this cannot share or bypass paid video services.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-mist">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={camera}
              onChange={(e) => setCamera(e.target.checked)}
            />{" "}
            Join with camera
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={microphone}
              onChange={(e) => setMicrophone(e.target.checked)}
            />{" "}
            Join with microphone
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            track("video_joined", { partyId, source: "party_video_room" });
            video.join(camera, microphone);
          }}
          className="mt-3 rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
        >
          Join video room
        </button>
        {!video.turnConfigured && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-soft">
            STUN-only mode — no TURN relay configured. Face video often works on
            home Wi‑Fi, but corporate / carrier NAT may fail ICE. Chat and Ready
            still work if video cannot connect.
          </p>
        )}
        {screenShare && !screenShare.supported ? (
          <p className="mt-2 text-[11px] leading-relaxed text-mist/70">
            Screen share needs a desktop browser with display capture. On this
            device you can still join with camera, upload a free/owned video, or
            host screen share from a computer / TV mode.
          </p>
        ) : null}
        {video.error && (
          <p className="mt-2 text-xs text-amber-soft" role="alert">
            {video.error}
          </p>
        )}
      </section>
    );
  }

  const anyFailed = Array.from(video.connectionStates.values()).some(
    (s) => s === "failed" || s === "disconnected"
  );
  const reconnecting = Array.from(video.connectionStates.values()).some(
    (s) => s === "reconnecting" || s === "connecting"
  );

  return (
    <section className="mt-4 rounded-xl border border-line bg-ink/35 p-3">
      {anyFailed ? (
        <p className="mb-2 rounded-lg border border-amber/40 bg-amber/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-soft" role="status">
          ICE failed for at least one peer — usually strict NAT without TURN.
          Leave call and rejoin, or stay on chat. We are not faking a paid stream;
          this is face video only.
        </p>
      ) : reconnecting ? (
        <p className="mb-2 text-[11px] text-mist/75" role="status">
          Reconnecting a peer… if it stalls, leave and rejoin video.
        </p>
      ) : null}
      {onVideoNames.length > 0 ? (
        <p className="mb-2 text-[11px] text-mist/75">
          <span className="font-medium text-teal-soft">On video:</span>{" "}
          {onVideoNames.join(", ")}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <VideoTile stream={video.localStream} label="You" muted />
        {Array.from(video.remoteStreams.entries()).map(([userId, stream]) => (
          <VideoTile
            key={userId}
            stream={stream}
            label={
              peerLabels.get(userId) ||
              partyUserLabel(userId, directoryUsers).name
            }
            connection={video.connectionStates.get(userId) || "connected"}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void video.toggle("microphone").then(setMicrophone)}
          className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
        >
          {microphone ? "Mute mic" : "Unmute mic"}
        </button>
        <button
          type="button"
          onClick={() => void video.toggle("camera").then(setCamera)}
          className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
        >
          {camera ? "Turn camera off" : "Turn camera on"}
        </button>
        {canScreenShare ? (
          <button
            type="button"
            onClick={() => void video.shareScreen()}
            className="rounded-lg border border-teal/40 px-3 py-2 text-xs text-teal-soft"
          >
            Share screen with party
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAlts((v) => !v)}
            className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
            aria-expanded={showAlts}
          >
            {showAlts ? "Hide share options" : "Share options (no screen)"}
          </button>
        )}
        <button
          type="button"
          onClick={video.leave}
          className="rounded-lg bg-amber/20 px-3 py-2 text-xs text-amber-soft"
        >
          Leave call
        </button>
      </div>
      {canScreenShare ? (
        <p className="mt-2 text-[11px] text-mist/60">
          Speaking ring + connection badge show who&apos;s talking and weak links.
          Screen share fans out live to party peers (WebRTC). Do not share paid
          streamer app windows.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-mist/60">
          Speaking ring + connection badge show who&apos;s talking and weak links.
          Display capture is not available in this browser — use the share
          options below.
        </p>
      )}
      {!canScreenShare && screenShare && (showAlts || screenShare.isIos) ? (
        <ScreenShareAlternatives
          capability={screenShare}
          cameraOn={camera}
          onEnableCamera={() => {
            void video.toggle("camera").then((on) => {
              setCamera(on);
              setShowAlts(true);
            });
          }}
        />
      ) : null}
      {video.error && (
        <p className="mt-2 text-xs text-amber-soft" role="alert">
          {video.error}
        </p>
      )}
    </section>
  );
}

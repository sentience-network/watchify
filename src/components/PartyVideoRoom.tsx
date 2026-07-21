"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePartyVideo } from "@/hooks/usePartyVideo";
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

export function PartyVideoRoom({ partyId }: { partyId: string }) {
  const video = usePartyVideo(partyId);
  const { directoryUsers } = useWatchify();
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
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
          onClick={() => video.join(camera, microphone)}
          className="mt-3 rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
        >
          Join video room
        </button>
        {!video.turnConfigured && (
          <p className="mt-2 text-[11px] text-amber-soft">
            TURN is not configured; calls may fail on strict corporate/mobile
            networks.
          </p>
        )}
        {video.error && (
          <p className="mt-2 text-xs text-amber-soft" role="alert">
            {video.error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-ink/35 p-3">
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
        <button
          type="button"
          onClick={() => void video.shareScreen()}
          className="rounded-lg border border-teal/40 px-3 py-2 text-xs text-teal-soft"
        >
          Share screen with party
        </button>
        <button
          type="button"
          onClick={video.leave}
          className="rounded-lg bg-amber/20 px-3 py-2 text-xs text-amber-soft"
        >
          Leave call
        </button>
      </div>
      <p className="mt-2 text-[11px] text-mist/60">
        Speaking ring + connection badge show who&apos;s talking and weak links.
        Screen share fans out live to party peers (WebRTC). Do not share paid
        streamer app windows.
      </p>
      {video.error && (
        <p className="mt-2 text-xs text-amber-soft" role="alert">
          {video.error}
        </p>
      )}
    </section>
  );
}

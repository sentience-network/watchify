"use client";

import { useEffect, useRef, useState } from "react";
import { usePartyVideo } from "@/hooks/usePartyVideo";

function VideoTile({ stream, label, muted }: { stream: MediaStream | null; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  const hasVideo = Boolean(stream?.getVideoTracks().some((track) => track.enabled && track.readyState === "live"));
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-ink">
      <video ref={ref} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${muted ? "-scale-x-100" : ""}`} />
      {!hasVideo && <div className="absolute inset-0 grid place-items-center text-sm text-mist">Camera off</div>}
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">{label}</span>
    </div>
  );
}

export function PartyVideoRoom({ partyId }: { partyId: string }) {
  const video = usePartyVideo(partyId);
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("watchify_video_defaults") || "{}");
      setCamera(Boolean(saved.camera));
      setMicrophone(Boolean(saved.microphone));
    } catch {}
  }, []);

  if (!video.joined) {
    return (
      <section className="mt-4 rounded-xl border border-line bg-ink/35 p-4" aria-labelledby={`video-${partyId}`}>
        <h3 id={`video-${partyId}`} className="font-semibold text-white">Face-to-face video · up to 6</h3>
        <p className="mt-1 text-xs leading-relaxed text-mist/70">
          Optional camera and microphone for people only. Nothing is recorded, and this cannot share or bypass paid video services.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-mist">
          <label className="flex items-center gap-2"><input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} /> Join with camera</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={microphone} onChange={(e) => setMicrophone(e.target.checked)} /> Join with microphone</label>
        </div>
        <button type="button" onClick={() => video.join(camera, microphone)} className="mt-3 rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink">
          Join video room
        </button>
        {!video.turnConfigured && <p className="mt-2 text-[11px] text-amber-soft">TURN is not configured; calls may fail on strict corporate/mobile networks.</p>}
        {video.error && <p className="mt-2 text-xs text-amber-soft" role="alert">{video.error}</p>}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-ink/35 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <VideoTile stream={video.localStream} label="You" muted />
        {Array.from(video.remoteStreams.entries()).map(([userId, stream]) => (
          <VideoTile key={userId} stream={stream} label={video.peers.get(userId)?.name || "Party member"} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void video.toggle("microphone").then(setMicrophone)} className="rounded-lg border border-line px-3 py-2 text-xs text-mist">{microphone ? "Mute mic" : "Unmute mic"}</button>
        <button type="button" onClick={() => void video.toggle("camera").then(setCamera)} className="rounded-lg border border-line px-3 py-2 text-xs text-mist">{camera ? "Turn camera off" : "Turn camera on"}</button>
        <button type="button" onClick={() => void video.shareScreen()} className="rounded-lg border border-teal/40 px-3 py-2 text-xs text-teal-soft">Share screen with party</button>
        <button type="button" onClick={video.leave} className="rounded-lg bg-amber/20 px-3 py-2 text-xs text-amber-soft">Leave call</button>
      </div>
      <p className="mt-2 text-[11px] text-mist/60">Screen share fans out live to party peers (WebRTC). Do not share paid streamer app windows.</p>
      {video.error && <p className="mt-2 text-xs text-amber-soft" role="alert">{video.error}</p>}
    </section>
  );
}

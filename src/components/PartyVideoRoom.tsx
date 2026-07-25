"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePartyVideo } from "@/hooks/usePartyVideo";
import { track } from "@/lib/analytics-client";
import {
  iosAppOpenHref,
  probeNativeIosScreenShare,
} from "@/lib/ios-screen-share";
import {
  getScreenShareCapability,
  SCREEN_SHARE_ALTERNATIVES,
  SCREEN_SHARE_SOFT_LIMITS,
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
  dominant,
  screenBadge,
  mirror,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  connection?: string;
  dominant?: boolean;
  screenBadge?: boolean;
  mirror?: boolean;
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
      className={`relative overflow-hidden rounded-xl border bg-ink ${
        dominant ? "aspect-[9/16] max-h-[70vh] w-full sm:aspect-video" : "aspect-video"
      } ${
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
        className={`h-full w-full ${
          dominant ? "object-contain bg-black" : "object-cover"
        } ${mirror ? "-scale-x-100" : ""}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center text-sm text-mist">
          {screenBadge ? "Screen off" : "Camera off"}
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
        {label}
        {screenBadge ? " · screen" : ""}
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
  partyId,
}: {
  capability: ScreenShareCapability;
  cameraOn: boolean;
  onEnableCamera: () => void;
  partyId: string;
}) {
  const alts = SCREEN_SHARE_ALTERNATIVES.filter((alt) => {
    if (alt.id === "ios_app" && (!capability.isIos || capability.nativeIosBridge)) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="mt-2 rounded-lg border border-line/80 bg-ink/50 px-3 py-2.5"
      role="status"
    >
      <p className="text-[11px] font-medium text-amber-soft">
        {capability.isIos && !capability.nativeIosBridge
          ? "Safari cannot share other apps"
          : "Screen share unavailable here"}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-mist/80">
        {capability.unsupportedReason ||
          "This browser cannot capture the display."}
      </p>
      {capability.isIos && !capability.nativeIosBridge ? (
        <a
          href={iosAppOpenHref(partyId)}
          className="mt-2 inline-flex rounded-lg bg-teal px-3 py-2 text-[11px] font-semibold text-ink"
        >
          Open in Watchify iOS app
        </a>
      ) : null}
      <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-mist/85">
        {alts.map((alt) => (
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
            ) : alt.id === "ios_app" ? (
              <>
                {alt.detail}{" "}
                <a
                  href={iosAppOpenHref(partyId)}
                  className="text-teal-soft underline underline-offset-2"
                >
                  Open app
                </a>
              </>
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

function shareButtonLabel(
  capability: ScreenShareCapability | null,
  busy: boolean
): string {
  if (busy) return "Starting…";
  if (capability?.nativeIosBridge) return "Share Screen (iOS)";
  return "Share screen";
}

export function PartyVideoRoom({
  partyId,
  canHostShare = false,
  screenParty = false,
}: {
  partyId: string;
  /** Host or co-host — gets the primary Share screen CTA. */
  canHostShare?: boolean;
  /** Party created as screen / TikTok-style mode. */
  screenParty?: boolean;
}) {
  const video = usePartyVideo(partyId);
  const { directoryUsers } = useWatchify();
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [screenShare, setScreenShare] = useState<ScreenShareCapability | null>(
    null
  );
  const [showAlts, setShowAlts] = useState(false);
  const [busyShare, setBusyShare] = useState(false);

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
    let cancelled = false;
    setScreenShare(getScreenShareCapability({ nativeIosBridge: false }));
    void probeNativeIosScreenShare().then((nativeIosBridge) => {
      if (cancelled) return;
      setScreenShare(getScreenShareCapability({ nativeIosBridge }));
    });
    return () => {
      cancelled = true;
    };
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

  const canScreenShare = screenShare?.canShare === true;
  const showHostShareCta = canHostShare;

  const remoteScreenPeerId = useMemo(() => {
    for (const [userId, peer] of Array.from(video.peers.entries())) {
      if (peer.screen && video.remoteStreams.has(userId)) return userId;
    }
    return null;
  }, [video.peers, video.remoteStreams]);

  const screenLayout =
    video.sharingScreen || Boolean(remoteScreenPeerId) || screenParty;

  async function startShare() {
    setBusyShare(true);
    try {
      if (!video.joined) {
        track("video_joined", {
          partyId,
          source: "screen_share_cta",
        });
        const joinedOk = await video.join(false, true);
        if (!joinedOk) return;
      }
      const ok = await video.shareScreen();
      if (ok) {
        track("screen_share_started", {
          partyId,
          source: screenParty ? "screen_party" : "party_video_room",
          nativeIos: Boolean(screenShare?.nativeIosBridge),
        });
      }
    } finally {
      setBusyShare(false);
    }
  }

  if (!video.joined) {
    return (
      <section
        className="mt-4 rounded-xl border border-line bg-ink/35 p-4"
        aria-labelledby={`video-${partyId}`}
      >
        <h3 id={`video-${partyId}`} className="font-semibold text-white">
          {screenParty
            ? "Screen party · face + chat"
            : "Face-to-face video · up to 6"}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-mist/70">
          {screenParty
            ? "Host shares their phone or desktop screen (TikTok, Shorts, Reels, free/owned media). Friends watch along with chat and optional face cams. Watchify relays the host capture — it does not proxy app CDNs or bypass paid streamers."
            : "Free for every party member — cam/mic join does not require Party plan. Optional camera and microphone for people only. Nothing is recorded, and this cannot share or bypass paid video services."}
        </p>
        {showHostShareCta && canScreenShare ? (
          <button
            type="button"
            disabled={busyShare}
            onClick={() => void startShare()}
            className="mt-3 w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-ink transition hover:bg-teal-soft disabled:opacity-60 sm:w-auto"
          >
            {shareButtonLabel(screenShare, busyShare)}
          </button>
        ) : null}
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
          className="mt-3 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-mist hover:text-white"
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
        {screenShare?.mobileHostTip ? (
          <p className="mt-2 text-[11px] leading-relaxed text-mist/70">
            {screenShare.mobileHostTip}
          </p>
        ) : null}
        {screenShare && !screenShare.canShare ? (
          <>
            <p className="mt-2 text-[11px] leading-relaxed text-mist/70">
              {screenShare.unsupportedReason}
            </p>
            {(showAlts || screenShare.isIos || screenParty) && (
              <ScreenShareAlternatives
                capability={screenShare}
                cameraOn={camera}
                onEnableCamera={() => setCamera(true)}
                partyId={partyId}
              />
            )}
            {!screenShare.isIos && !screenParty ? (
              <button
                type="button"
                onClick={() => setShowAlts((v) => !v)}
                className="mt-2 text-[11px] text-teal-soft underline underline-offset-2"
              >
                {showAlts ? "Hide options" : "Show share options"}
              </button>
            ) : null}
          </>
        ) : null}
        <p className="mt-2 text-[10px] leading-relaxed text-mist/55">
          {SCREEN_SHARE_SOFT_LIMITS}
        </p>
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

  const faceTiles: {
    key: string;
    stream: MediaStream | null;
    label: string;
    muted?: boolean;
    connection?: string;
    mirror?: boolean;
  }[] = [];

  if (video.sharingScreen && video.facePreviewStream) {
    faceTiles.push({
      key: "you-face",
      stream: video.facePreviewStream,
      label: "You",
      muted: true,
      mirror: true,
    });
  } else if (!video.sharingScreen) {
    faceTiles.push({
      key: "you",
      stream: video.localStream,
      label: "You",
      muted: true,
      mirror: true,
    });
  }

  for (const [userId, stream] of Array.from(video.remoteStreams.entries())) {
    if (userId === remoteScreenPeerId && !video.sharingScreen) continue;
    faceTiles.push({
      key: userId,
      stream,
      label:
        peerLabels.get(userId) ||
        partyUserLabel(userId, directoryUsers).name,
      connection: video.connectionStates.get(userId) || "connected",
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-ink/35 p-3">
      {screenParty || video.sharingScreen || remoteScreenPeerId ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-teal">
          {screenParty ? "Screen party" : "Screen share live"}
        </p>
      ) : null}
      {anyFailed ? (
        <p
          className="mb-2 rounded-lg border border-amber/40 bg-amber/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-soft"
          role="status"
        >
          ICE failed for at least one peer — usually strict NAT without TURN.
          Tap Reconnect, or stay on chat. This is host screen / face video only
          — not a paid stream proxy.
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

      {video.sharingScreen ? (
        <VideoTile
          stream={video.localStream}
          label="Your screen"
          muted
          dominant
          screenBadge
        />
      ) : remoteScreenPeerId ? (
        <VideoTile
          stream={video.remoteStreams.get(remoteScreenPeerId) || null}
          label={`${
            peerLabels.get(remoteScreenPeerId) || "Host"
          }'s screen`}
          connection={
            video.connectionStates.get(remoteScreenPeerId) || "connected"
          }
          dominant
          screenBadge
        />
      ) : null}

      <div
        className={`mt-2 grid gap-2 ${
          screenLayout
            ? "grid-cols-3 sm:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {faceTiles.map((tile) => (
          <VideoTile
            key={tile.key}
            stream={tile.stream}
            label={tile.label}
            muted={tile.muted}
            connection={tile.connection}
            mirror={tile.mirror}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {showHostShareCta && canScreenShare && !video.sharingScreen ? (
          <button
            type="button"
            disabled={busyShare}
            onClick={() => void startShare()}
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {shareButtonLabel(screenShare, busyShare)}
          </button>
        ) : null}
        {video.sharingScreen ? (
          <button
            type="button"
            onClick={() => {
              void video.stopScreenShare();
              track("screen_share_stopped", { partyId });
            }}
            className="rounded-xl border border-amber/50 bg-amber/15 px-4 py-2.5 text-sm font-semibold text-amber-soft"
          >
            Stop sharing
          </button>
        ) : null}
        {!showHostShareCta && canScreenShare && !video.sharingScreen ? (
          <button
            type="button"
            disabled={busyShare}
            onClick={() => void startShare()}
            className="rounded-lg border border-teal/40 px-3 py-2 text-xs text-teal-soft disabled:opacity-60"
          >
            {screenShare?.nativeIosBridge
              ? "Share Screen (iOS)"
              : "Share screen with party"}
          </button>
        ) : null}
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
          disabled={video.sharingScreen}
        >
          {camera ? "Turn camera off" : "Turn camera on"}
        </button>
        {!canScreenShare ? (
          <button
            type="button"
            onClick={() => setShowAlts((v) => !v)}
            className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
            aria-expanded={showAlts}
          >
            {showAlts ? "Hide share options" : "Share options (no screen)"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void video.reconnectVideo()}
          className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
        >
          Reconnect
        </button>
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
          {screenShare?.mobileHostTip ||
            "Screen share fans out live to party peers (WebRTC). Social apps (TikTok, Shorts, Reels) and free/owned media are OK; do not share paid streamer app windows."}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-mist/60">
          Display capture is not available in this browser — use the share
          options below.
        </p>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-mist/50">
        {SCREEN_SHARE_SOFT_LIMITS}
      </p>
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
          partyId={partyId}
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

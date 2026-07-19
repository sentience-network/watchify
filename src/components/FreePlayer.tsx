"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { getMovie } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { useWatchify } from "@/lib/store";
import { usePartyRealtime } from "@/hooks/usePartyRealtime";

type Props = {
  movieId: string;
  partyId?: string;
  autoplay?: boolean;
};

type YtPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.body.appendChild(s);
    }
    // Already loading / race: poll briefly
    const start = Date.now();
    const t = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(t);
        resolve();
      } else if (Date.now() - start > 12000) {
        window.clearInterval(t);
        resolve();
      }
    }, 100);
  });
}

/** In-app player for Watchify free/CC/PD titles (MP4 or YouTube embed). */
export function FreePlayer({ movieId, partyId, autoplay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<YtPlayer | null>(null);
  const ytElementId = `watchify-yt-${movieId}`;
  const { state, updatePartyPlayback, setCurrentlyWatching, ready } =
    useWatchify();
  const movie = getMovie(movieId);
  const sync = partyId
    ? state.partyPlaybackSync.find((p) => p.partyId === partyId)
    : undefined;
  const applyingRemote = useRef(false);
  const lastBroadcast = useRef(0);
  const useYoutube = Boolean(movie?.youtubePlaybackId);

  usePartyRealtime(partyId || "", Boolean(ready && partyId));

  useEffect(() => {
    if (isFreePlayable(movie)) {
      setCurrentlyWatching(movieId, { serviceId: null, progressPercent: 0 });
    }
  }, [movie, movieId, setCurrentlyWatching]);

  // YouTube player lifecycle
  useEffect(() => {
    if (!useYoutube || !movie?.youtubePlaybackId) return;
    let cancelled = false;
    let player: YtPlayer | null = null;

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      const el = document.getElementById(ytElementId);
      if (!el) return;
      player = new window.YT.Player(ytElementId, {
        videoId: movie.youtubePlaybackId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (!partyId || applyingRemote.current || !player) return;
            const playing =
              e.data === window.YT!.PlayerState.PLAYING ||
              e.data === window.YT!.PlayerState.BUFFERING;
            const paused = e.data === window.YT!.PlayerState.PAUSED;
            if (!playing && !paused) return;
            const now = Date.now();
            if (now - lastBroadcast.current < 400) return;
            lastBroadcast.current = now;
            updatePartyPlayback(partyId, player.getCurrentTime(), playing);
          },
        },
      });
      ytPlayerRef.current = player;
    });

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, [
    useYoutube,
    movie?.youtubePlaybackId,
    ytElementId,
    autoplay,
    partyId,
    updatePartyPlayback,
  ]);

  // Apply remote sync — HTML5
  useEffect(() => {
    if (useYoutube) return;
    const el = videoRef.current;
    if (!el || !sync || !partyId) return;
    if (sync.updatedBy === state.currentUserId) return;
    applyingRemote.current = true;
    if (Math.abs(el.currentTime - sync.positionSec) > 1.5) {
      el.currentTime = sync.positionSec;
    }
    if (sync.playing && el.paused) void el.play().catch(() => undefined);
    if (!sync.playing && !el.paused) el.pause();
    const t = window.setTimeout(() => {
      applyingRemote.current = false;
    }, 150);
    return () => window.clearTimeout(t);
  }, [sync, partyId, state.currentUserId, useYoutube]);

  // Apply remote sync — YouTube
  useEffect(() => {
    if (!useYoutube) return;
    const player = ytPlayerRef.current;
    if (!player || !sync || !partyId) return;
    if (sync.updatedBy === state.currentUserId) return;
    applyingRemote.current = true;
    try {
      const cur = player.getCurrentTime();
      if (Math.abs(cur - sync.positionSec) > 1.5) {
        player.seekTo(sync.positionSec, true);
      }
      if (sync.playing) player.playVideo();
      else player.pauseVideo();
    } catch {
      /* player may not be ready */
    }
    const t = window.setTimeout(() => {
      applyingRemote.current = false;
    }, 250);
    return () => window.clearTimeout(t);
  }, [sync, partyId, state.currentUserId, useYoutube]);

  // Periodic YouTube playhead broadcast while playing
  useEffect(() => {
    if (!useYoutube || !partyId) return;
    const id = window.setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || applyingRemote.current) return;
      try {
        if (player.getPlayerState() !== window.YT?.PlayerState.PLAYING) return;
        const now = Date.now();
        if (now - lastBroadcast.current < 2800) return;
        lastBroadcast.current = now;
        updatePartyPlayback(partyId, player.getCurrentTime(), true);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [useYoutube, partyId, updatePartyPlayback]);

  if (!movie || !isFreePlayable(movie)) {
    return (
      <div className="rounded-2xl border border-line bg-panel/50 p-6 text-sm text-mist">
        This title is not available for free in-app playback. Watch trailers or
        share what you&apos;re watching from your own streaming account.{" "}
        <Link href="/content" className="text-teal-soft hover:underline">
          How Watchify gets content
        </Link>
      </div>
    );
  }

  function broadcast() {
    if (!partyId || applyingRemote.current || !videoRef.current) return;
    const now = Date.now();
    if (now - lastBroadcast.current < 400) return;
    lastBroadcast.current = now;
    updatePartyPlayback(
      partyId,
      videoRef.current.currentTime,
      !videoRef.current.paused
    );
  }

  return (
    <div className="space-y-3">
      {useYoutube ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <div id={ytElementId} className="h-full w-full" />
        </div>
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-2xl bg-black"
          src={movie.freePlaybackUrl}
          controls
          playsInline
          autoPlay={autoplay}
          onPlay={broadcast}
          onPause={broadcast}
          onSeeked={broadcast}
          onTimeUpdate={() => {
            if (!partyId || applyingRemote.current || !videoRef.current) return;
            const t = Math.floor(videoRef.current.currentTime);
            if (t % 3 === 0) broadcast();
          }}
        />
      )}
      <p className="text-xs text-mist/70">
        Free on Watchify · License:{" "}
        {movie.licenseKind?.replace("_", " ") || "free sample"}
        {useYoutube ? " · YouTube embed" : ""} ·{" "}
        {partyId
          ? "Joining a party auto-seeks to the live playhead."
          : "Party sync works for Watchify free titles only — not Netflix or other paid apps."}
      </p>
      {movie.attribution && (
        <p className="text-xs text-mist/70">
          © {movie.attribution.creator} ·{" "}
          <a
            href={movie.attribution.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-teal-soft hover:underline"
          >
            {movie.attribution.license}
          </a>
          {" · "}
          <a
            href={movie.attribution.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-teal-soft hover:underline"
          >
            verified source
          </a>
        </p>
      )}
    </div>
  );
}

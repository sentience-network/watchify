"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { archiveEmbedUrl } from "@/lib/archive-org";
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
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts?: Record<string, unknown>
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.YT?.Player) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      done(Boolean(window.YT?.Player));
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => done(false);
      document.body.appendChild(s);
    }
    const start = Date.now();
    const t = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(t);
        done(true);
      } else if (Date.now() - start > 8000) {
        window.clearInterval(t);
        done(false);
      }
    }, 100);
  });
}

/** In-app player for Watchify free/CC/PD titles (MP4 or YouTube embed). */
export function FreePlayer({ movieId, partyId, autoplay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<YtPlayer | null>(null);
  const ytElementId = `watchify-yt-${movieId}`;
  const {
    state,
    updatePartyPlayback,
    setCurrentlyWatching,
    setWatchingProgress,
    ready,
  } = useWatchify();
  const movie = getMovie(movieId);
  const sync = partyId
    ? state.partyPlaybackSync.find((p) => p.partyId === partyId)
    : undefined;
  const applyingRemote = useRef(false);
  const lastBroadcast = useRef(0);
  const useYoutube = Boolean(movie?.youtubePlaybackId);
  const mp4Url =
    movie?.freePlaybackUrl &&
    !movie.freePlaybackUrl.includes("archive.org/embed/")
      ? movie.freePlaybackUrl
      : undefined;
  const archiveId =
    movie?.archiveOrgId ||
    (movie?.id?.startsWith("ia-") ? movie.id.slice(3) : undefined);
  const useArchiveEmbed = Boolean(!useYoutube && !mp4Url && archiveId);

  const youtubeEmbedSrc = useMemo(() => {
    if (!movie?.youtubePlaybackId) return "";
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      enablejsapi: "1",
    });
    if (autoplay) params.set("autoplay", "1");
    return `https://www.youtube.com/embed/${movie.youtubePlaybackId}?${params.toString()}`;
  }, [movie?.youtubePlaybackId, autoplay]);

  const archiveEmbedSrc = useMemo(() => {
    if (!archiveId) return "";
    return archiveEmbedUrl(archiveId, Boolean(autoplay));
  }, [archiveId, autoplay]);

  usePartyRealtime(partyId || "", Boolean(ready && partyId));

  useEffect(() => {
    if (isFreePlayable(movie)) {
      setCurrentlyWatching(movieId, {
        serviceId: null,
        progressPercent: 0,
        startTracker: true,
      });
    }
  }, [movie, movieId, setCurrentlyWatching]);

  // Push rough progress % to presence so friends see where you are.
  useEffect(() => {
    if (!movie?.runtime || movie.runtime <= 0) return;
    const runtimeSec = movie.runtime * 60;
    const id = window.setInterval(() => {
      let current = 0;
      try {
        if (videoRef.current && !videoRef.current.paused) {
          current = videoRef.current.currentTime;
        } else if (ytPlayerRef.current?.getCurrentTime) {
          if (
            ytPlayerRef.current.getPlayerState?.() !==
            window.YT?.PlayerState.PLAYING
          ) {
            return;
          }
          current = ytPlayerRef.current.getCurrentTime();
        } else {
          return;
        }
      } catch {
        return;
      }
      const pct = Math.min(99, Math.round((current / runtimeSec) * 100));
      setWatchingProgress(pct);
    }, 12000);
    return () => window.clearInterval(id);
  }, [movie?.runtime, setWatchingProgress]);

  // Optional IFrame API for party sync — plain iframe already plays without it.
  useEffect(() => {
    if (!useYoutube || !movie?.youtubePlaybackId || !partyId) return;
    let cancelled = false;

    void loadYouTubeApi().then((ok) => {
      if (cancelled || !ok || !window.YT?.Player) return;
      const el = document.getElementById(ytElementId);
      if (!el) return;
      try {
        const player = new window.YT.Player(ytElementId, {
          events: {
            onStateChange: (e: { data: number }) => {
              if (applyingRemote.current || !ytPlayerRef.current) return;
              const playing =
                e.data === window.YT!.PlayerState.PLAYING ||
                e.data === window.YT!.PlayerState.BUFFERING;
              const paused = e.data === window.YT!.PlayerState.PAUSED;
              if (!playing && !paused) return;
              const now = Date.now();
              if (now - lastBroadcast.current < 400) return;
              lastBroadcast.current = now;
              updatePartyPlayback(
                partyId,
                ytPlayerRef.current.getCurrentTime(),
                playing
              );
            },
          },
        });
        ytPlayerRef.current = player;
      } catch {
        ytPlayerRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      ytPlayerRef.current = null;
    };
  }, [useYoutube, movie?.youtubePlaybackId, ytElementId, partyId, updatePartyPlayback]);

  // Apply remote sync — HTML5
  useEffect(() => {
    if (useYoutube || useArchiveEmbed) return;
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
  }, [sync, partyId, state.currentUserId, useYoutube, useArchiveEmbed]);

  // Apply remote sync — YouTube (when API attached)
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
          <iframe
            id={ytElementId}
            title={`${movie.title} — free on Watchify`}
            className="h-full w-full border-0"
            src={youtubeEmbedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : useArchiveEmbed ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <iframe
            title={`${movie.title} — Internet Archive`}
            className="h-full w-full border-0"
            src={archiveEmbedSrc}
            allow="fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-2xl bg-black"
          src={mp4Url}
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
        {useYoutube
          ? " · YouTube embed"
          : useArchiveEmbed
            ? " · Internet Archive embed"
            : " · Direct file"}{" "}
        ·{" "}
        {partyId
          ? useArchiveEmbed
            ? "Archive embeds play in-party chat; scrub sync is limited vs MP4/YouTube free titles."
            : "Joining a party auto-seeks to the live playhead."
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

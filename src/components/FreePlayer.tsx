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

/** In-app player for Watchify-hosted free/CC titles only. */
export function FreePlayer({ movieId, partyId, autoplay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, updatePartyPlayback, setCurrentlyWatching, ready } =
    useWatchify();
  const movie = getMovie(movieId);
  const sync = partyId
    ? state.partyPlaybackSync.find((p) => p.partyId === partyId)
    : undefined;
  const applyingRemote = useRef(false);
  const lastBroadcast = useRef(0);

  // Keep socket alive on /watch?party= even without PartySocialPanel
  usePartyRealtime(partyId || "", Boolean(ready && partyId));

  useEffect(() => {
    if (movie?.freePlaybackUrl) {
      setCurrentlyWatching(movieId, { serviceId: null, progressPercent: 0 });
    }
  }, [movie?.freePlaybackUrl, movieId, setCurrentlyWatching]);

  useEffect(() => {
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
  }, [sync, partyId, state.currentUserId]);

  if (!movie || !isFreePlayable(movie) || !movie.freePlaybackUrl) {
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
      <p className="text-xs text-mist/70">
        Free on Watchify · License:{" "}
        {movie.licenseKind?.replace("_", " ") || "free sample"} ·{" "}
        {partyId
          ? "Joining a party auto-seeks to the live playhead."
          : "Party sync works for Watchify-hosted free titles only — not Netflix or other paid apps."}
      </p>
      {movie.attribution && (
        <p className="text-xs text-mist/70">
          © {movie.attribution.creator} ·{" "}
          <a href={movie.attribution.licenseUrl} target="_blank" rel="noreferrer" className="text-teal-soft hover:underline">{movie.attribution.license}</a>
          {" · "}
          <a href={movie.attribution.sourceUrl} target="_blank" rel="noreferrer" className="text-teal-soft hover:underline">verified source</a>
        </p>
      )}
    </div>
  );
}

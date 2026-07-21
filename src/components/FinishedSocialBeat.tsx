"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToasts } from "./ToastStack";
import { getMovie } from "@/lib/movies";
import { isFreePlayable } from "@/lib/free-content";
import { watchingShareUrl } from "@/lib/share";

const KEY = "watchify_finished_beat_movie";

/**
 * After markFinished, offer one social beat: share / party / DM path.
 * Triggered via sessionStorage from NowWatchingBar.
 */
export function FinishedSocialBeat() {
  const { pushToast } = useToasts();
  const [movieId, setMovieId] = useState<string | null>(null);

  useEffect(() => {
    function read() {
      try {
        const id = sessionStorage.getItem(KEY);
        if (id) {
          sessionStorage.removeItem(KEY);
          setMovieId(id);
        }
      } catch {
        /* ignore */
      }
    }
    read();
    window.addEventListener("watchify:finished", read);
    return () => window.removeEventListener("watchify:finished", read);
  }, []);

  useEffect(() => {
    if (!movieId) return;
    const movie = getMovie(movieId);
    if (!movie) {
      setMovieId(null);
      return;
    }
    const free = isFreePlayable(movie);
    pushToast({
      id: `finished_${movieId}`,
      title: `Finished ${movie.title}`,
      body: "Tell a friend, or start a party for next time.",
      href: `/parties?create=1&movieId=${encodeURIComponent(movieId)}&syncMode=${
        free ? "watchify_free" : "own_account"
      }`,
      cta: "Create party",
    });
    // Secondary toast with share path after a beat
    window.setTimeout(() => {
      pushToast({
        id: `finished_share_${movieId}`,
        title: "Share that you finished",
        body: "Presence keeps the flywheel spinning.",
        href: typeof window !== "undefined" ? watchingShareUrl("me") : "/feed",
        cta: "Open feed",
      });
    }, 400);
    setMovieId(null);
  }, [movieId, pushToast]);

  return null;
}

export function signalFinishedBeat(movieId: string) {
  try {
    sessionStorage.setItem(KEY, movieId);
    window.dispatchEvent(new Event("watchify:finished"));
  } catch {
    /* ignore */
  }
}

/** Tiny inline CTAs when toast stack isn’t enough — used under the dock. */
export function FinishedBeatLinks({ movieId }: { movieId: string }) {
  const movie = getMovie(movieId);
  if (!movie) return null;
  const free = isFreePlayable(movie);
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      <Link
        href={`/parties?create=1&movieId=${encodeURIComponent(movieId)}&syncMode=${
          free ? "watchify_free" : "own_account"
        }`}
        className="rounded-lg bg-teal px-2.5 py-1 font-semibold text-ink"
      >
        Party this next
      </Link>
      <Link
        href="/messages"
        className="rounded-lg border border-line px-2.5 py-1 text-mist"
      >
        Message a friend
      </Link>
    </div>
  );
}

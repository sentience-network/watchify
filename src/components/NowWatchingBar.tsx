"use client";

import Link from "next/link";
import { SafePosterImage } from "@/components/SafePosterImage";
import { ShareMenu } from "@/components/ShareMenu";
import { ServiceBadge } from "@/components/ServiceBadge";
import { getMovie } from "@/lib/movies";
import { watchingShareUrl } from "@/lib/share";
import { useWatchify } from "@/lib/store";
import { isFreePlayable } from "@/lib/free-content";
import { signalFinishedBeat } from "@/components/FinishedSocialBeat";

const tap =
  "inline-flex min-h-[var(--tap-min)] items-center justify-center rounded-lg px-3 py-2 text-xs font-medium";

export function NowWatchingBar() {
  const {
    state,
    currentUserId,
    setCurrentlyWatching,
    markFinished,
    setWatchingPublic,
    ready,
  } = useWatchify();
  const movie = state.currentlyWatchingId
    ? getMovie(state.currentlyWatchingId)
    : null;

  if (!ready) return null;

  const uid = currentUserId || "me";
  const shareUrl =
    typeof window !== "undefined"
      ? watchingShareUrl(uid)
      : `/share/watching/${uid}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-ink pb-[env(safe-area-inset-bottom,0px)] shadow-bar">
      <div className="mx-auto flex min-h-[var(--now-bar-h)] max-w-7xl items-center gap-2 px-3 py-2 md:gap-3 md:px-6 md:py-2.5">
        {movie ? (
          <>
            <div className="relative h-11 w-7 shrink-0 overflow-hidden rounded md:h-14 md:w-10">
              <SafePosterImage movie={movie} alt="" size="w342" sizes="40px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-teal-soft [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] animate-pulsebar">
                Now watching
                {state.watchingPublic ? " · Public" : " · Private"}
              </p>
              <p className="truncate font-display text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)] md:text-base">
                {movie.title}
              </p>
              <p className="hidden truncate text-xs text-mist sm:block">
                {movie.year} · {movie.genres.slice(0, 2).join(" · ")}
              </p>
              {state.currentlyWatchingServiceId && (
                <div className="mt-0.5 hidden sm:block">
                  <ServiceBadge serviceId={state.currentlyWatchingServiceId} />
                </div>
              )}
            </div>
            {/* Horizontal scroll on narrow screens — avoids wrap overflow covering CTAs */}
            <div className="scrollbar-thin -mr-1 flex max-w-[58%] shrink-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 sm:max-w-none sm:flex-wrap sm:overflow-visible md:gap-2">
              {(isFreePlayable(movie) || movie.trailerYoutubeId) && (
                <Link
                  href={`/watch/${movie.id}`}
                  className={`${tap} shrink-0 border border-teal/50 bg-teal/10 text-teal-soft hover:bg-teal/20`}
                >
                  {isFreePlayable(movie) ? "Play" : "Trailer"}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setWatchingPublic(!state.watchingPublic)}
                className={`${tap} shrink-0 border border-line bg-white/5 text-white/90 hover:bg-white/10 hover:text-white`}
                title="Toggle whether strangers can see what you're watching"
              >
                {state.watchingPublic ? "Hide" : "Public"}
              </button>
              <ShareMenu
                compact
                url={shareUrl}
                title={`Watching ${movie.title} on Watchify`}
                text={`I'm watching ${movie.title} on Watchify — follow me`}
                onBeforeShare={() => {
                  if (!state.watchingPublic) setWatchingPublic(true);
                }}
              />
              <Link
                href={`/parties?create=1&movieId=${encodeURIComponent(movie.id)}&syncMode=${
                  isFreePlayable(movie) ? "watchify_free" : "own_account"
                }`}
                className={`${tap} shrink-0 bg-teal font-semibold text-ink hover:bg-teal-soft`}
              >
                Party
              </Link>
              <button
                type="button"
                onClick={() => {
                  signalFinishedBeat(movie.id);
                  markFinished(movie.id);
                }}
                className={`${tap} shrink-0 bg-amber font-semibold text-ink hover:bg-amber-soft`}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => setCurrentlyWatching(null)}
                className={`${tap} shrink-0 border border-line bg-white/5 text-white/90 hover:bg-white/10 hover:text-white`}
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3 py-0.5">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
                Nothing queued
              </p>
              <p className="truncate text-xs text-mist">
                Pick a title, go public, invite friends.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/discover"
                className={`${tap} bg-teal font-semibold text-ink`}
              >
                Pick
              </Link>
              <Link
                href="/parties"
                className={`${tap} border border-teal/40 bg-teal/15 text-teal-soft`}
              >
                Parties
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom,0px)] shadow-bar backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 md:px-6">
        {movie ? (
          <>
            <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded md:h-14 md:w-10">
              <SafePosterImage movie={movie} alt="" size="w342" sizes="40px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-teal animate-pulsebar">
                Now watching
                {state.watchingPublic ? " · Public" : " · Private"}
              </p>
              <p className="truncate font-display text-sm font-semibold text-white md:text-base">
                {movie.title}
              </p>
              <p className="truncate text-xs text-mist/70">
                {movie.year} · {movie.genres.slice(0, 2).join(" · ")}
              </p>
              {state.currentlyWatchingServiceId && (
                <div className="mt-0.5">
                  <ServiceBadge serviceId={state.currentlyWatchingServiceId} />
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {(isFreePlayable(movie) || movie.trailerYoutubeId) && (
                <Link
                  href={`/watch/${movie.id}`}
                  className="rounded-lg border border-teal/40 px-2.5 py-2 text-[11px] font-medium text-teal-soft hover:bg-teal/10"
                >
                  {isFreePlayable(movie) ? "Play" : "Trailer"}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setWatchingPublic(!state.watchingPublic)}
                className="rounded-lg border border-line px-2.5 py-2 text-[11px] text-mist hover:text-white"
                title="Toggle whether strangers can see what you're watching"
              >
                {state.watchingPublic ? "Hide" : "Go public"}
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
                className="rounded-lg bg-teal px-2.5 py-2 text-[11px] font-semibold text-ink hover:bg-teal-soft"
              >
                Create party
              </Link>
              <button
                type="button"
                onClick={() => {
                  signalFinishedBeat(movie.id);
                  markFinished(movie.id);
                }}
                className="rounded-lg bg-amber px-3 py-2 text-xs font-semibold text-ink hover:bg-amber-soft"
              >
                Finished
              </button>
              <button
                type="button"
                onClick={() => setCurrentlyWatching(null)}
                className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3 py-1">
            <div>
              <p className="font-display text-sm font-semibold text-white">
                Nothing queued
              </p>
              <p className="text-xs text-mist/70">
                Pick a title, go public, invite friends — that&apos;s the flywheel.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/discover"
                className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
              >
                Pick a title
              </Link>
              <Link
                href="/parties"
                className="rounded-lg bg-teal/15 px-3 py-2 text-xs font-medium text-teal-soft"
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

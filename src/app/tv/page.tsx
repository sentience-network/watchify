"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { MoviePoster } from "@/components/MoviePoster";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie } from "@/lib/movies";
import { partyShareUrl } from "@/lib/share";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

/**
 * Lean-back companion for living-room browsers / Fire Stick browser / iPad on TV.
 * Not a native TV store app — the 2-week wedge for "across every screen."
 */
export default function TvCompanionPage() {
  const { openParties, publicWatching, directoryUsers, currentUserId, state } =
    useWatchify();
  const live = useMemo(
    () => openParties.filter((p) => p.isLive).slice(0, 6),
    [openParties]
  );
  const watching = publicWatching.slice(0, 8);
  const me = directoryUsers.find((u) => u.id === currentUserId);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-2 pb-16 pt-4 md:px-0">
        <header className="mb-10 text-center animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal">
            Living room · companion
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
            Who&apos;s watching
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-mist/80">
            Put this on the big screen. Chat and invites stay on phones — each
            person opens the title on their own service.
          </p>
          {me ? (
            <p className="mt-2 text-sm text-teal-soft">Signed in as {me.name}</p>
          ) : (
            <Link href="/auth/signin?callbackUrl=/tv" className="mt-3 inline-block text-sm text-teal-soft hover:underline">
              Sign in for your friends graph →
            </Link>
          )}
        </header>

        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl font-semibold text-white">
            Live parties
          </h2>
          {live.length === 0 ? (
            <div className="rounded-2xl border border-line bg-panel/40 p-8 text-center">
              <p className="text-mist">No live rooms right now.</p>
              <Link
                href="/parties"
                className="mt-4 inline-block rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink"
              >
                Start a party
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {live.map((party) => {
                const movie = getMovie(party.movieId);
                const host = getUser(party.hostId);
                if (!movie || !host) return null;
                return (
                  <article
                    key={party.id}
                    className="flex gap-4 rounded-2xl border border-teal/30 bg-panel/60 p-5 animate-party-pulse"
                  >
                    <MoviePoster movie={movie} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-soft">
                        Live · {party.memberIds.length} in room
                      </p>
                      <p className="mt-1 font-display text-xl font-semibold text-white">
                        {party.name}
                      </p>
                      <p className="text-sm text-mist">
                        {movie.title} · {host.name}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/parties?join=${party.id}`}
                          className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink"
                        >
                          Open party
                        </Link>
                        <ShareMenu
                          url={partyShareUrl(party.inviteCode || party.id)}
                          title={`${party.name} on Watchify`}
                          text={`Join ${host.name}'s party for ${movie.title}`}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-white">
            Friends & public now
          </h2>
          {watching.length === 0 ? (
            <p className="text-mist">
              Nobody sharing yet.{" "}
              <Link href="/settings" className="text-teal-soft hover:underline">
                Share what you&apos;re watching
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {watching.map((row) => {
                const movie = getMovie(row.movieId);
                const user = getUser(row.userId);
                if (!movie) return null;
                return (
                  <div
                    key={row.userId}
                    className="rounded-2xl border border-line bg-panel/50 p-3"
                  >
                    <div className="mx-auto w-fit">
                      <MoviePoster movie={movie} size="sm" />
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {user?.name || "Watcher"}
                      {row.isFriend ? " · Friend" : ""}
                    </p>
                    <p className="text-xs text-mist">{movie.title}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {state.linkedServices.length === 0 && (
          <p className="mt-10 text-center text-sm text-mist/70">
            Link your services in{" "}
            <Link href="/settings" className="text-teal-soft hover:underline">
              Settings
            </Link>{" "}
            so friends know where to open titles.
          </p>
        )}
      </div>
    </AppShell>
  );
}

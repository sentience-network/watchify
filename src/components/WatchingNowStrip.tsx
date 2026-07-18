"use client";

import Link from "next/link";
import { getMovie } from "@/lib/movies";
import { getUser } from "@/lib/users";
import { useWatchify } from "@/lib/store";
import { MoviePoster } from "./MoviePoster";
import { ServiceBadge } from "./ServiceBadge";

export function WatchingNowStrip() {
  const { publicWatching, ready } = useWatchify();

  if (!ready || !publicWatching.length) return null;

  return (
    <section className="mb-8 animate-fade-up">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Public on Watchify
          </p>
          <h2 className="font-display text-xl font-semibold text-white">
            Watching now
          </h2>
          <p className="mt-1 text-xs text-mist/70">
            Follow friends for free — you don’t need their streaming plan to see
            this.
          </p>
        </div>
        <Link
          href="/parties"
          className="text-xs font-medium text-teal-soft hover:underline"
        >
          Join a party →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {publicWatching.map((row) => {
          const user = getUser(row.userId);
          const movie = getMovie(row.movieId);
          if (!user || !movie) return null;
          return (
            <Link
              key={row.userId}
              href={`/profile/${user.id}`}
              className="w-[132px] shrink-0 rounded-xl border border-line bg-panel/40 p-2 transition hover:border-teal/35"
            >
              <MoviePoster movie={movie} size="sm" />
              <p className="mt-2 truncate text-xs font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-mist/70">{movie.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <ServiceBadge serviceId={row.serviceId} />
                {typeof row.progressPercent === "number" && (
                  <span className="text-[10px] text-mist/60">
                    {row.progressPercent}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-teal/80">
                {row.isFriend ? "Friend" : "Open"}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

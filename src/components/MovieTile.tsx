"use client";

import Link from "next/link";
import { useState } from "react";
import type { Movie } from "@/lib/types";
import { isFreePlayable } from "@/lib/free-content";
import { useWatchify } from "@/lib/store";
import { MoviePoster } from "./MoviePoster";

type Props = {
  movie: Movie;
};

export function MovieTile({ movie }: Props) {
  const { myWatchlists, addToWatchlist, setCurrentlyWatching, markFinished } =
    useWatchify();
  const [menu, setMenu] = useState(false);
  const free = isFreePlayable(movie);
  const topProvider = movie.providers?.[0];

  const label = free
    ? "Free on Watchify"
    : movie.trailerYoutubeId
      ? "Trailer"
      : topProvider
        ? `On ${topProvider.name}`
        : movie.tmdbId
          ? "TMDB"
          : "";

  return (
    <div className="group relative w-[140px] shrink-0 animate-fade-up">
      <Link href={`/watch/${movie.id}`} className="text-left">
        <MoviePoster movie={movie} />
        <p className="mt-2 line-clamp-2 font-display text-sm font-semibold leading-snug text-white">
          {movie.title}
        </p>
        <p className="text-xs text-mist/70">
          {movie.year} · {movie.rating.toFixed(1)}
          {label ? ` · ${label}` : ""}
        </p>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        {(free || movie.trailerYoutubeId) && (
          <Link
            href={`/watch/${movie.id}`}
            className="rounded-md bg-teal/15 px-2 py-1 text-[11px] font-medium text-teal-soft"
          >
            {free ? "Play" : "Trailer"}
          </Link>
        )}
        {topProvider && !free && (
          <a
            href={topProvider.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line px-2 py-1 text-[11px] text-mist"
          >
            {topProvider.name}
          </a>
        )}
        <button
          type="button"
          onClick={() => setCurrentlyWatching(movie.id)}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-mist"
        >
          Share
        </button>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-mist"
        >
          + List
        </button>
        <button
          type="button"
          onClick={() => markFinished(movie.id)}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-mist"
        >
          Done
        </button>
      </div>
      {menu && (
        <div className="absolute left-0 top-[210px] z-30 w-48 animate-slide-in rounded-xl border border-line bg-panel p-2 shadow-glow">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-mist/60">
            Add to watchlist
          </p>
          {myWatchlists.length === 0 && (
            <p className="px-2 py-2 text-xs text-mist">No lists yet</p>
          )}
          {myWatchlists.map((wl) => (
            <button
              key={wl.id}
              type="button"
              onClick={() => {
                addToWatchlist(wl.id, movie.id);
                setMenu(false);
              }}
              className="block w-full rounded-lg px-2 py-2 text-left text-sm text-mist hover:bg-white/5 hover:text-white"
            >
              {wl.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

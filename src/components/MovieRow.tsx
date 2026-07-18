"use client";

import type { Movie } from "@/lib/types";
import { MovieTile } from "./MovieTile";

type Props = {
  title: string;
  movies: Movie[];
  subtitle?: string;
};

export function MovieRow({ title, movies, subtitle }: Props) {
  if (!movies.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-mist/75">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <MovieTile movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}

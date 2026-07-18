"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MoviePoster } from "@/components/MoviePoster";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie } from "@/lib/movies";
import { watchlistShareUrl } from "@/lib/share";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

export default function SharedWatchlistPage() {
  const params = useParams<{ id: string }>();
  const { state } = useWatchify();
  const list = state.watchlists.find((w) => w.id === params.id);
  const owner = list ? getUser(list.ownerId) : undefined;

  if (!list || (!list.isPublic && list.ownerId !== state.currentUserId)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
        <p className="font-display text-2xl font-bold text-white">
          Watch<span className="text-teal">ify</span>
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-white">
          List unavailable
        </h1>
        <p className="mt-2 text-mist">
          This watchlist is private or no longer exists.
        </p>
        <Link href="/discover" className="mt-6 text-teal hover:text-teal-soft">
          Open Watchify
        </Link>
      </main>
    );
  }

  const movies = list.movieIds
    .map((id) => getMovie(id))
    .filter(Boolean)
    .map((m) => m!);
  const url =
    typeof window !== "undefined"
      ? watchlistShareUrl(list.id)
      : `/share/watchlist/${list.id}`;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10">
      <p className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </p>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-teal">
            Shared watchlist
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            {list.name}
          </h1>
          {owner && (
            <p className="mt-1 text-sm text-mist">
              by{" "}
              <Link
                href={`/profile/${owner.id}`}
                className="text-white hover:text-teal-soft"
              >
                {owner.name}
              </Link>
            </p>
          )}
          {list.description && (
            <p className="mt-2 text-mist">{list.description}</p>
          )}
        </div>
        <ShareMenu
          url={url}
          title={`${list.name} on Watchify`}
          text={`Watchlist on Watchify: ${list.name}`}
        />
      </header>

      <ul className="mt-8 space-y-3">
        {movies.map((movie) => (
          <li
            key={movie.id}
            className="flex gap-3 rounded-xl border border-line bg-panel/50 p-3"
          >
            <MoviePoster movie={movie} size="sm" />
            <div>
              <p className="font-display font-semibold text-white">
                {movie.title}
              </p>
              <p className="text-xs text-mist/70">
                {movie.year} · {movie.genres.slice(0, 2).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/discover"
        className="mt-10 inline-flex rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink hover:bg-teal-soft"
      >
        Open Watchify
      </Link>
    </main>
  );
}

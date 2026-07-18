"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MoviePoster } from "@/components/MoviePoster";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie } from "@/lib/movies";
import { useWatchify } from "@/lib/store";
import { watchlistShareUrl } from "@/lib/share";

export default function WatchlistDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    state,
    currentUserId,
    renameWatchlist,
    removeFromWatchlist,
    setCurrentlyWatching,
    markFinished,
  } = useWatchify();
  const list = state.watchlists.find((w) => w.id === params.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (!list) {
    return (
      <AppShell>
        <p className="text-mist">Watchlist not found.</p>
        <Link href="/watchlists" className="mt-4 inline-block text-teal">
          Back to watchlists
        </Link>
      </AppShell>
    );
  }

  const isOwner = list.ownerId === currentUserId;
  const movies = list.movieIds
    .map((id) => getMovie(id))
    .filter(Boolean)
    .map((m) => m!);
  const url =
    typeof window !== "undefined"
      ? watchlistShareUrl(list.id)
      : `/share/watchlist/${list.id}`;

  function startEdit() {
    setName(list!.name);
    setDesc(list!.description);
    setEditing(true);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/watchlists"
          className="text-sm text-mist hover:text-teal-soft"
        >
          ← Watchlists
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
          <div>
            {editing ? (
              <div className="space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 font-display text-xl text-white"
                />
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      renameWatchlist(list.id, name, desc);
                      setEditing(false);
                    }}
                    className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-3xl font-bold text-white">
                  {list.name}
                </h1>
                <p className="mt-1 text-sm text-mist/80">
                  {movies.length} titles · {list.isPublic ? "Public" : "Private"}
                </p>
                {list.description && (
                  <p className="mt-2 text-mist">{list.description}</p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner && !editing && (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-line px-3 py-2 text-sm text-mist"
              >
                Edit
              </button>
            )}
            {list.isPublic && (
              <ShareMenu
                url={url}
                title={`${list.name} on Watchify`}
                text={`Watchlist on Watchify: ${list.name}`}
              />
            )}
          </div>
        </header>

        <ul className="mt-8 space-y-3">
          {movies.map((movie) => (
            <li
              key={movie.id}
              className="flex gap-4 rounded-2xl border border-line bg-panel/40 p-3"
            >
              <MoviePoster movie={movie} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-white">
                  {movie.title}
                </p>
                <p className="text-xs text-mist/70">
                  {movie.year} · {movie.runtime} min · {movie.rating.toFixed(1)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-mist/80">
                  {movie.overview}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentlyWatching(movie.id)}
                    className="rounded-md bg-teal/15 px-2 py-1 text-xs text-teal-soft"
                  >
                    Now watching
                  </button>
                  <button
                    type="button"
                    onClick={() => markFinished(movie.id)}
                    className="rounded-md border border-line px-2 py-1 text-xs text-mist"
                  >
                    Finished
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => removeFromWatchlist(list.id, movie.id)}
                      className="rounded-md border border-line px-2 py-1 text-xs text-mist hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
          {!movies.length && (
            <p className="text-mist">
              Empty list — add titles from Discover.
            </p>
          )}
        </ul>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoviePoster } from "@/components/MoviePoster";
import { isFreePlayable } from "@/lib/free-content";
import {
  freeMovies,
  getMovie,
  rememberCatalogMovies,
  searchMovies,
} from "@/lib/movies";
import type { Movie } from "@/lib/types";

type Props = {
  value: string;
  onChange: (movieId: string, movie?: Movie) => void;
  /** Prefer free-playable titles when true; still searchable. */
  freeOnly?: boolean;
  placeholder?: string;
};

export function TitlePicker({
  value,
  onChange,
  freeOnly = false,
  placeholder = "Search movies & TV…",
}: Props) {
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<Movie[]>([]);
  const [livePage, setLivePage] = useState(1);
  const [liveTotalPages, setLiveTotalPages] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = value ? getMovie(value) : undefined;
  const free = useMemo(() => freeMovies(), []);

  const localResults = useMemo(() => {
    const q = query.trim();
    let list = q ? searchMovies(q) : freeOnly ? free : searchMovies("").slice(0, 40);
    if (freeOnly) list = list.filter((m) => isFreePlayable(m));
    return list;
  }, [query, freeOnly, free]);

  const results = useMemo(() => {
    if (freeOnly) {
      const seen = new Set(localResults.map((m) => m.id));
      const extras = free.filter(
        (m) =>
          !seen.has(m.id) &&
          (!query.trim() ||
            m.title.toLowerCase().includes(query.trim().toLowerCase()))
      );
      return [...localResults, ...extras];
    }
    if (query.trim() && liveResults.length) {
      const seen = new Set(liveResults.map((m) => m.id));
      const localExtra = localResults.filter((m) => !seen.has(m.id));
      return [...liveResults, ...localExtra];
    }
    return localResults.length ? localResults : free.slice(0, 24);
  }, [freeOnly, query, liveResults, localResults, free]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q || freeOnly) {
      setLiveResults([]);
      setLivePage(1);
      setLiveTotalPages(0);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&page=1`)
        .then((r) => r.json())
        .then((data) => {
          const movies = (data.movies || []) as Movie[];
          rememberCatalogMovies(movies);
          setLiveResults(movies);
          setLivePage(data.page || 1);
          setLiveTotalPages(data.totalPages || 0);
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, open, freeOnly]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function loadMore() {
    const q = query.trim();
    if (!q || freeOnly || livePage >= liveTotalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = livePage + 1;
      const res = await fetch(
        `/api/catalog/search?q=${encodeURIComponent(q)}&page=${next}`
      );
      const data = await res.json();
      const movies = (data.movies || []) as Movie[];
      rememberCatalogMovies(movies);
      setLiveResults((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...movies.filter((m) => !seen.has(m.id))];
      });
      setLivePage(data.page || next);
      setLiveTotalPages(data.totalPages || liveTotalPages);
    } finally {
      setLoadingMore(false);
    }
  }

  function pick(movie: Movie) {
    rememberCatalogMovies([movie]);
    onChange(movie.id, movie);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {selected ? (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-teal/35 bg-teal/10 px-3 py-2">
          <MoviePoster movie={selected} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {selected.title}
            </p>
            <p className="text-xs text-mist/70">
              {selected.year}
              {isFreePlayable(selected) ? " · Free on Watchify" : " · Catalog"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setQuery("");
            }}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs text-mist hover:text-white"
          >
            Change
          </button>
        </div>
      ) : null}

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          selected
            ? "Search to change title…"
            : freeOnly
              ? "Search free Watchify titles…"
              : placeholder
        }
        className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
        autoComplete="off"
      />

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-panel shadow-lg">
          <p className="sticky top-0 border-b border-line/80 bg-panel px-3 py-2 text-[10px] uppercase tracking-wider text-mist/55">
            {freeOnly
              ? "Free Watchify titles"
              : searching
                ? "Searching TMDB…"
                : query.trim()
                  ? "Search results"
                  : "Browse titles"}
          </p>
          <ul>
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => pick(m)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 ${
                    m.id === value ? "bg-teal/10" : ""
                  }`}
                >
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded">
                    <MoviePoster movie={m} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {m.title}
                    </p>
                    <p className="truncate text-xs text-mist/65">
                      {m.year}
                      {isFreePlayable(m) ? " · Free sync" : ""}
                      {m.genres?.[0] ? ` · ${m.genres[0]}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {!results.length ? (
              <li className="px-3 py-4 text-sm text-mist/70">
                No titles match. Try another search.
              </li>
            ) : null}
          </ul>
          {!freeOnly && query.trim() && livePage < liveTotalPages ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="w-full border-t border-line px-3 py-2.5 text-xs font-medium text-teal-soft hover:bg-white/5 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more results"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

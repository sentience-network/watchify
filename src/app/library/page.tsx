"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { freeMovies, posterUrl, rememberCatalogMovies } from "@/lib/movies";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";
import type { Movie } from "@/lib/types";

type FreeKind = "all" | "movies" | "tv";

type FreeCatalogResponse = {
  movies: Movie[];
  curated?: Movie[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  kind?: FreeKind;
  note?: string;
  curatedCount?: number;
  countsHint?: { curated: number; archiveKind: FreeKind; archiveTotal: number };
};

function TitleCard({ m }: { m: Movie }) {
  const thumb = posterUrl(m, "w500");
  return (
    <Link
      href={`/watch/${m.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-panel/50 transition hover:border-teal/40"
    >
      <div className="relative aspect-video w-full bg-ink">
        <Image
          src={thumb}
          alt={`${m.title} preview`}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={
            thumb.startsWith("http") && !thumb.includes("image.tmdb.org")
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-ink">
          Play free
        </span>
      </div>
      <div className="p-3">
        <p className="font-display font-semibold text-white">{m.title}</p>
        <p className="text-xs text-mist/70">
          {m.year || "—"} · {m.licenseKind?.replace("_", " ") || "free"}
          {m.runtime ? ` · ${m.runtime}m` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-mist">{m.overview}</p>
      </div>
    </Link>
  );
}

export default function LibraryPage() {
  const curatedLocal = freeMovies();
  const [curated, setCurated] = useState<Movie[]>(curatedLocal);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [kind, setKind] = useState<FreeKind>("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextPage: number, nextQ: string, nextKind: FreeKind) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: "24",
          kind: nextKind,
        });
        if (nextQ.trim()) params.set("q", nextQ.trim());
        const res = await fetch(`/api/catalog/free?${params.toString()}`);
        const data = (await res.json()) as FreeCatalogResponse & {
          error?: string;
        };
        if (!res.ok) {
          setError(data.error || "Could not load free catalog");
          return;
        }
        if (data.curated?.length) {
          setCurated(data.curated);
          rememberCatalogMovies(data.curated);
        } else if (nextKind === "tv") {
          setCurated([]);
        }
        setMovies(data.movies || []);
        rememberCatalogMovies(data.movies || []);
        setPage(data.page || nextPage);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setNote(data.note || null);
      } catch {
        setError("Could not reach the free catalog. Retry in a moment.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(1, "", "all");
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(q);
    void load(1, q, kind);
  }

  function onKind(next: FreeKind) {
    setKind(next);
    void load(1, search, next);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Free
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Free & licensed on Watchify
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist/80">
            Thousands of public-domain movies and classic TV episodes from
            Internet Archive, plus curated Creative Commons shorts. Play in-app —
            not Netflix scrapes.
          </p>
          <p className="mt-2 text-xs text-mist/60">{STREAMING_HONEST_COPY}</p>
          {note && (
            <p className="mt-3 text-xs text-teal-soft">
              {note}
              {total
                ? ` · Showing page ${page} of ${totalPages.toLocaleString()}`
                : ""}
            </p>
          )}
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "All free"],
              ["movies", "Movies"],
              ["tv", "TV / episodes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onKind(id)}
              className={
                kind === id
                  ? "rounded-xl bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal-soft"
                  : "rounded-xl border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="mb-8 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              kind === "tv"
                ? "Search free classic TV…"
                : "Search free Archive titles…"
            }
            className="auth-field min-w-[220px] flex-1 rounded-xl border border-line bg-ink/80 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSearch("");
                void load(1, "", kind);
              }}
              className="rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
            >
              Clear
            </button>
          )}
        </form>

        {!search && kind !== "tv" && curated.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-white">
              Curated picks
            </h2>
            <p className="mt-1 text-xs text-mist/65">
              {curated.length} hand-checked CC / PD titles with reliable
              playback.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((m) => (
                <TitleCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold text-white">
            {search
              ? `Results for “${search}”`
              : kind === "tv"
                ? "Classic TV (Internet Archive)"
                : kind === "movies"
                  ? "Feature films (Internet Archive)"
                  : "Internet Archive library"}
          </h2>
          <p className="mt-1 text-xs text-mist/65">
            {total
              ? `${total.toLocaleString()} public-domain MPEG4 titles in this filter`
              : "Loading Archive catalog…"}
          </p>

          {error && <p className="mt-4 text-sm text-amber-soft">{error}</p>}
          {loading && (
            <p className="mt-6 text-sm text-mist">Loading free titles…</p>
          )}

          {!loading && (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {movies.map((m) => (
                <TitleCard key={m.id} m={m} />
              ))}
            </div>
          )}

          {!loading && !movies.length && !error && (
            <p className="mt-6 text-sm text-mist">No titles matched that search.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1, search, kind)}
                className="rounded-xl border border-line px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-xs text-mist/70">
                Page {page} / {totalPages.toLocaleString()}
              </p>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1, search, kind)}
                className="rounded-xl border border-line px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>

        <div className="mt-10">
          <ScreenSharePanel />
        </div>

        <p className="mt-8 text-sm text-mist/70">
          Want licensed studio catalog too? Read{" "}
          <Link href="/content" className="text-teal-soft hover:underline">
            how Watchify acquires content
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

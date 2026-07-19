"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SafePosterImage } from "@/components/SafePosterImage";
import { rememberCatalogMovies } from "@/lib/movies";
import type { Movie } from "@/lib/types";

type SeriesPayload = {
  series?: {
    slug: string;
    title: string;
    episodeCount: number;
    year: number;
    posterPath: string;
    firstEpisodeId: string;
    episodes: Movie[];
  };
  error?: string;
};

function episodeLabel(m: Movie, index: number): string {
  if (m.season && m.episode) {
    return `S${String(m.season).padStart(2, "0")}E${String(m.episode).padStart(2, "0")}`;
  }
  if (m.episode) return `Ep ${m.episode}`;
  return `Ep ${index + 1}`;
}

export default function SeriesPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(0);
  const [episodes, setEpisodes] = useState<Movie[]>([]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetch(`/api/catalog/free/series/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: SeriesPayload) => {
        if (cancelled) return;
        if (!data.series) {
          setError(data.error || "Series not found");
          return;
        }
        setTitle(data.series.title);
        setYear(data.series.year);
        setEpisodes(data.series.episodes || []);
        rememberCatalogMovies(data.series.episodes || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load series.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
          Free TV series
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">
              {title || (loading ? "Loading…" : "Series")}
            </h1>
            <p className="mt-1 text-sm text-mist/75">
              {year ? `${year} · ` : ""}
              {episodes.length
                ? `${episodes.length} episodes · ordered ep1 → last`
                : "Public-domain classic TV"}
            </p>
          </div>
          <Link
            href="/library?kind=tv"
            className="text-sm text-teal-soft hover:underline"
          >
            ← All free TV
          </Link>
        </div>

        {error && <p className="mt-6 text-sm text-amber-soft">{error}</p>}
        {loading && <p className="mt-6 text-sm text-mist">Loading episodes…</p>}

        {!loading && episodes.length > 0 && (
          <ol className="mt-8 space-y-2">
            {episodes.map((ep, i) => {
              const label = episodeLabel(ep, i);
              const name = ep.episodeTitle || ep.title;
              return (
                <li key={ep.id}>
                  <Link
                    href={`/watch/${ep.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-panel/40 px-3 py-2.5 transition hover:border-teal/40"
                  >
                    <span className="w-16 shrink-0 text-xs font-semibold text-teal-soft">
                      {label}
                    </span>
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-ink">
                      <SafePosterImage
                        movie={ep}
                        alt=""
                        size="w342"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {name}
                      </p>
                      <p className="text-xs text-mist/65">
                        {ep.year || "—"}
                        {ep.runtime ? ` · ${ep.runtime}m` : ""} · Play free
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SafePosterImage } from "@/components/SafePosterImage";
import {
  LIVE_CATEGORY_LABELS,
  type LiveCategory,
} from "@/lib/live-tv";
import { rememberCatalogMovies } from "@/lib/movies";
import type { Movie } from "@/lib/types";

type CategoryFilter = LiveCategory | "all";

type LiveResponse = {
  channels: Movie[];
  total: number;
  category: CategoryFilter;
  categories: { id: LiveCategory; label: string }[];
  note?: string;
};

function ChannelCard({ m }: { m: Movie }) {
  const category =
    m.liveCategory && m.liveCategory in LIVE_CATEGORY_LABELS
      ? LIVE_CATEGORY_LABELS[m.liveCategory]
      : "Live";
  return (
    <Link
      href={`/watch/${m.id}`}
      className="group overflow-hidden rounded-2xl border border-line bg-panel/50 transition hover:border-teal/40"
    >
      <div className="relative aspect-video w-full bg-ink">
        <SafePosterImage
          movie={m}
          alt={`${m.title} live`}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-amber px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
          <span className="h-1.5 w-1.5 animate-live-glow rounded-full bg-ink" />
          Live
        </span>
        <span className="absolute bottom-3 left-3 rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-ink">
          Watch free
        </span>
        <span className="absolute bottom-3 right-3 rounded-md bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-mist">
          {category}
        </span>
      </div>
      <div className="p-3">
        <p className="font-display font-semibold text-white">{m.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-mist">{m.overview}</p>
        {m.attribution?.creator && (
          <p className="mt-2 text-[11px] text-mist/60">{m.attribution.creator}</p>
        )}
      </div>
    </Link>
  );
}

export default function LiveTvPage() {
  const [channels, setChannels] = useState<Movie[]>([]);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextCategory: CategoryFilter, nextQ: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ category: nextCategory });
      if (nextQ.trim()) params.set("q", nextQ.trim());
      const res = await fetch(`/api/catalog/live?${params.toString()}`);
      const data = (await res.json()) as LiveResponse & { error?: string };
      if (!res.ok) {
        setChannels([]);
        setError(data.error || "Could not load live TV");
        return;
      }
      setChannels(data.channels || []);
      rememberCatalogMovies(data.channels || []);
      setNote(data.note || null);
    } catch {
      setChannels([]);
      setError("Could not reach the live TV catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("all", "");
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(q);
    void load(category, q);
  }

  function onCategory(next: CategoryFilter) {
    setCategory(next);
    void load(next, search);
  }

  const filters: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "All live" },
    { id: "news", label: LIVE_CATEGORY_LABELS.news },
    { id: "science", label: LIVE_CATEGORY_LABELS.science },
    { id: "lifestyle", label: LIVE_CATEGORY_LABELS.lifestyle },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Free Live TV
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Public channels, on now
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist/80">
            Watch free legal livestreams from public broadcasters and openly
            published linear channels — NASA, DW, France 24, Al Jazeera, and
            more. No cable login. Not piracy.
          </p>
          {note && <p className="mt-3 text-xs text-teal-soft">{note}</p>}
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onCategory(f.id)}
              className={
                category === f.id
                  ? "rounded-xl bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal-soft"
                  : "rounded-xl border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="mb-8 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search live channels…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink/60 px-3 py-2 text-sm text-white placeholder:text-mist/50"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink"
          >
            Search
          </button>
        </form>

        {loading && (
          <p className="text-sm text-mist">Loading live channels…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-amber">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((m) => (
              <ChannelCard key={m.id} m={m} />
            ))}
          </div>
        )}

        {!loading && !error && channels.length === 0 && (
          <p className="text-sm text-mist">No channels match that filter.</p>
        )}

        <p className="mt-10 text-xs text-mist/60">
          Prefer on-demand free films?{" "}
          <Link href="/library" className="text-teal-soft hover:underline">
            Browse Watchify Free
          </Link>
          {" · "}
          <Link href="/content" className="text-teal-soft hover:underline">
            How we get content
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

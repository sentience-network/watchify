"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { MovieTile } from "@/components/MovieTile";
import { personPosterUrl, type PersonCard } from "@/lib/people";
import { rememberCatalogMovies } from "@/lib/movies";
import type { FavoritePerson, Movie } from "@/lib/types";
import { useWatchify } from "@/lib/store";

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { directoryUsers, currentUserId, refreshFromServer } = useWatchify();
  const [person, setPerson] = useState<PersonCard | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const me = directoryUsers.find((u) => u.id === currentUserId);
  const already = Boolean(
    me?.favoritePeople?.some((p) => String(p.id) === String(params.id))
  );

  useEffect(() => {
    let cancelled = false;
    setError("");
    void fetch(`/api/catalog/people/${encodeURIComponent(params.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.person) {
          setError(data.error || "Person not found");
          return;
        }
        setPerson(data.person);
        setMovies(data.movies || []);
        rememberCatalogMovies(data.movies || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load person.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function toggleFavorite() {
    if (!session?.user || !person || !me) {
      setStatus("Sign in to save favorites on your profile.");
      return;
    }
    setSaving(true);
    setStatus("");
    const current = me.favoritePeople || [];
    let next: FavoritePerson[];
    if (already) {
      next = current.filter((p) => p.id !== person.id);
    } else {
      if (current.length >= 8) {
        setStatus("You can save up to 8 favorite people.");
        setSaving(false);
        return;
      }
      next = [
        ...current,
        {
          id: person.id,
          name: person.name,
          department: person.department,
          profilePath: person.profilePath,
        },
      ];
    }
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritePeople: next }),
      });
      if (!res.ok) {
        setStatus("Could not update favorites");
        return;
      }
      setStatus(already ? "Removed from profile" : "Saved to your profile");
      await refreshFromServer();
    } finally {
      setSaving(false);
    }
  }

  const thumb = person ? personPosterUrl(person.profilePath) : "";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl animate-fade-up">
        <Link
          href="/discover"
          className="text-sm text-teal-soft hover:underline"
        >
          ← Discover
        </Link>

        {error && <p className="mt-6 text-sm text-amber-soft">{error}</p>}
        {!person && !error && (
          <p className="mt-6 text-sm text-mist">Loading…</p>
        )}

        {person && (
          <>
            <header className="mt-6 flex flex-wrap gap-5">
              <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-2xl bg-panel">
                <Image
                  src={thumb}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized={thumb.startsWith("http")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.16em] text-teal">
                  {person.department === "Directing"
                    ? "Director"
                    : person.department === "Acting"
                      ? "Actor"
                      : "Creator"}
                </p>
                <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
                  {person.name}
                </h1>
                {person.knownFor && (
                  <p className="mt-1 text-sm text-mist/75">
                    Known for {person.knownFor}
                  </p>
                )}
                {person.biography && (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist line-clamp-5">
                    {person.biography}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void toggleFavorite()}
                    className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-50"
                  >
                    {already
                      ? "Remove from favorites"
                      : "Add to profile favorites"}
                  </button>
                  <Link
                    href={`/discover?people=${encodeURIComponent(person.name)}`}
                    className="rounded-xl border border-line px-4 py-2 text-sm text-mist hover:text-white"
                  >
                    Search more people
                  </Link>
                </div>
                {status && (
                  <p className="mt-2 text-xs text-amber-soft">{status}</p>
                )}
              </div>
            </header>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-white">
                Filmography
              </h2>
              <p className="mt-1 text-xs text-mist/65">
                Top credits — open any title for trailer / where to watch.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                {movies.map((m) => (
                  <MovieTile key={m.id} movie={m} />
                ))}
                {!movies.length && (
                  <p className="text-sm text-mist">No credits mapped yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

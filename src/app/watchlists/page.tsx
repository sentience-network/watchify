"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ShareMenu } from "@/components/ShareMenu";
import { useWatchify } from "@/lib/store";
import { watchlistShareUrl } from "@/lib/share";

export default function WatchlistsPage() {
  const { myWatchlists, createWatchlist, deleteWatchlist, togglePublic, watchlistLimit } =
    useWatchify();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const result = await createWatchlist(name, desc);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setName("");
    setDesc("");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Lists
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Your watchlists
          </h1>
          <p className="mt-2 text-sm text-mist/80">
            Create queues, keep some private, share the rest.
            {watchlistLimit !== null
              ? ` Free plan: ${myWatchlists.length}/${watchlistLimit} lists.`
              : " Unlimited lists on your plan."}
          </p>
        </header>

        <form
          onSubmit={onCreate}
          className="mb-8 rounded-2xl border border-line bg-panel/60 p-4"
        >
          <h2 className="font-display text-lg font-semibold text-white">
            New watchlist
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description"
              className="rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-amber-soft">
              {error}{" "}
              <a href="/pricing" className="underline">
                View pricing
              </a>
            </p>
          )}
          <button
            type="submit"
            className="mt-3 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink hover:bg-teal-soft"
          >
            Create list
          </button>
        </form>

        <ul className="space-y-3">
          {myWatchlists.map((wl) => {
            const url =
              typeof window !== "undefined"
                ? watchlistShareUrl(wl.id)
                : `/share/watchlist/${wl.id}`;
            return (
              <li
                key={wl.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/50 px-4 py-4 animate-slide-in"
              >
                <div className="min-w-0">
                  <Link
                    href={`/watchlists/${wl.id}`}
                    className="font-display text-lg font-semibold text-white hover:text-teal-soft"
                  >
                    {wl.name}
                  </Link>
                  <p className="text-sm text-mist/75">
                    {wl.movieIds.length} titles ·{" "}
                    {wl.isPublic ? "Public" : "Private"}
                  </p>
                  {wl.description && (
                    <p className="mt-1 text-sm text-mist/60">{wl.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePublic(wl.id)}
                    className="rounded-md border border-line px-2.5 py-1 text-xs text-mist hover:text-white"
                  >
                    Make {wl.isPublic ? "private" : "public"}
                  </button>
                  {wl.isPublic && (
                    <ShareMenu
                      compact
                      url={url}
                      title={`${wl.name} on Watchify`}
                      text={`Check out my Watchify watchlist: ${wl.name}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete “${wl.name}”?`)) deleteWatchlist(wl.id);
                    }}
                    className="rounded-md border border-line px-2.5 py-1 text-xs text-mist hover:border-red-400/40 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}

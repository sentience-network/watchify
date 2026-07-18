"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MoviePoster } from "@/components/MoviePoster";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { freeMovies } from "@/lib/movies";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";

export default function LibraryPage() {
  const free = freeMovies();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Free
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Free & licensed on Watchify
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist/80">
            Play Creative Commons / sample titles in-app, sync parties on these
            files, and screen-share only free or owned media. Paid streamers stay
            on their own apps — friends still follow the social share for free.
          </p>
          <p className="mt-2 text-xs text-mist/60">{STREAMING_HONEST_COPY}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {free.map((m) => (
            <Link
              key={m.id}
              href={`/watch/${m.id}`}
              className="flex gap-3 rounded-2xl border border-line bg-panel/50 p-3 transition hover:border-teal/35"
            >
              <div className="w-20 shrink-0">
                <MoviePoster movie={m} size="sm" />
              </div>
              <div>
                <p className="font-display font-semibold text-white">{m.title}</p>
                <p className="text-xs text-mist/70">
                  {m.year} · {m.licenseKind?.replace("_", " ")}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-mist">{m.overview}</p>
                <p className="mt-2 text-xs font-medium text-teal-soft">
                  Play on Watchify →
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <ScreenSharePanel />
        </div>

        <p className="mt-8 text-sm text-mist/70">
          Want more titles? Read{" "}
          <Link href="/content" className="text-teal-soft hover:underline">
            how Watchify acquires content
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

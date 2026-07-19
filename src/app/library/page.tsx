"use client";

import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { freeMovies, posterUrl } from "@/lib/movies";
import { STREAMING_HONEST_COPY } from "@/lib/streaming";

export default function LibraryPage() {
  const free = freeMovies();

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
            Play Creative Commons / public-domain titles in-app, sync parties on
            these films, and screen-share only free or owned media. Paid
            streamers stay on their own apps.
          </p>
          <p className="mt-2 text-xs text-mist/60">{STREAMING_HONEST_COPY}</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {free.map((m) => {
            const thumb = posterUrl(m, "w500");
            return (
              <Link
                key={m.id}
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
                      thumb.startsWith("http") &&
                      !thumb.includes("image.tmdb.org")
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-ink">
                    Play free
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-display font-semibold text-white">
                    {m.title}
                  </p>
                  <p className="text-xs text-mist/70">
                    {m.year} · {m.licenseKind?.replace("_", " ")} ·{" "}
                    {m.runtime}m
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-mist">
                    {m.overview}
                  </p>
                </div>
              </Link>
            );
          })}
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

"use client";

import Image from "next/image";
import { useState } from "react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/movies";

type Props = {
  movie: Movie;
  alt?: string;
  size?: "w342" | "w500";
  className?: string;
  sizes?: string;
  /** When true, fill a relative parent (aspect-video / fixed box). */
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * Poster with initials fallback when Archive/TMDB/YouTube thumb 404s.
 */
export function SafePosterImage({
  movie,
  alt,
  size = "w500",
  className = "object-cover",
  sizes,
  fill = true,
  width,
  height,
}: Props) {
  const [broken, setBroken] = useState(false);
  const src = posterUrl(movie, size);
  const label = alt ?? movie.title;
  const initials = movie.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  const unoptimized =
    src.startsWith("http") && !src.includes("image.tmdb.org");

  if (broken || !src || src.endsWith("/t/p/w500") || src.endsWith("/t/p/w342")) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-teal/35 via-ink to-ink px-2 text-center ${className}`}
        aria-label={label}
      >
        <span className="font-display text-xl font-bold text-white/90 md:text-2xl">
          {initials || "?"}
        </span>
        <span className="line-clamp-2 text-[10px] text-mist/80">{movie.title}</span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={label}
        fill
        className={className}
        sizes={sizes || "33vw"}
        onError={() => setBroken(true)}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      width={width || 342}
      height={height || 513}
      className={className}
      sizes={sizes}
      onError={() => setBroken(true)}
      unoptimized={unoptimized}
    />
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/movies";

type Props = {
  movie: Movie;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { w: 96, h: 144, img: "w342" as const },
  md: { w: 140, h: 210, img: "w342" as const },
  lg: { w: 180, h: 270, img: "w500" as const },
};

export function MoviePoster({ movie, size = "md", className = "" }: Props) {
  const s = sizes[size];
  const [broken, setBroken] = useState(false);
  const initials = movie.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div
      className={`poster-shine relative overflow-hidden rounded-lg bg-panel ${className}`}
      style={{ width: s.w, height: s.h }}
    >
      {broken ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-teal/30 to-ink px-2 text-center"
          aria-label={movie.title}
        >
          <span className="font-display text-2xl font-bold text-white/90">{initials}</span>
          <span className="line-clamp-2 text-[10px] text-mist/80">{movie.title}</span>
        </div>
      ) : (
        <Image
          src={posterUrl(movie, s.img)}
          alt={movie.title}
          fill
          className="object-cover"
          sizes={`${s.w}px`}
          onError={() => setBroken(true)}
          unoptimized={posterUrl(movie, s.img).startsWith("http") && !posterUrl(movie, s.img).includes("image.tmdb.org")}
        />
      )}
    </div>
  );
}

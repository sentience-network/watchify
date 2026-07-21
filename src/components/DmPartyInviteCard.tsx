"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMovie } from "@/lib/movies";
import { MoviePoster } from "./MoviePoster";

type PartyMeta = {
  id: string;
  name: string;
  movieId: string;
  inviteCode?: string;
};

/**
 * Rich DM card for party invite links (poster + room + Join).
 */
export function DmPartyInviteCard({
  linkUrl,
  fallbackText,
}: {
  linkUrl: string;
  fallbackText?: string;
}) {
  const [meta, setMeta] = useState<PartyMeta | null>(null);
  const [failed, setFailed] = useState(false);

  const partyKey = extractPartyKey(linkUrl);

  useEffect(() => {
    if (!partyKey) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    void fetch(`/api/share/party/${encodeURIComponent(partyKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.party) {
          setMeta({
            id: data.party.id,
            name: data.party.name,
            movieId: data.party.movieId,
            inviteCode: data.party.inviteCode,
          });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partyKey]);

  if (!partyKey || failed) {
    return (
      <a
        href={linkUrl}
        className="mt-1 block break-all text-[11px] text-teal-soft underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {fallbackText || linkUrl}
      </a>
    );
  }

  if (!meta) {
    return (
      <p className="mt-1 text-[11px] text-mist/55">Loading party invite…</p>
    );
  }

  const movie = getMovie(meta.movieId);
  const joinHref = `/parties?join=${encodeURIComponent(
    meta.inviteCode || meta.id
  )}`;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-teal/35 bg-ink/50">
      <div className="flex gap-3 p-2.5">
        {movie ? (
          <div className="w-14 shrink-0">
            <MoviePoster movie={movie} size="sm" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">
            Watchify party
          </p>
          <p className="truncate font-display text-sm font-semibold text-white">
            {meta.name}
          </p>
          {movie ? (
            <p className="truncate text-[11px] text-mist/70">
              {movie.title} ({movie.year})
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={joinHref}
              className="rounded-lg bg-teal px-2.5 py-1 text-[11px] font-semibold text-ink"
            >
              Join
            </Link>
            <Link
              href={`/share/party/${encodeURIComponent(meta.inviteCode || meta.id)}`}
              className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-mist hover:text-white"
            >
              Preview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function extractPartyKey(url: string): string | null {
  try {
    const u = new URL(url, "https://watchify.local");
    const share = u.pathname.match(/\/share\/party\/([^/]+)/i);
    if (share?.[1]) return decodeURIComponent(share[1]);
    const focus = u.pathname.match(/\/parties\/([^/]+)/i);
    if (focus?.[1] && focus[1] !== "page") return decodeURIComponent(focus[1]);
    const join = u.searchParams.get("join") || u.searchParams.get("invite");
    if (join) return join;
    return null;
  } catch {
    return null;
  }
}

export function looksLikePartyInvite(url: string | null | undefined): boolean {
  if (!url) return false;
  return Boolean(extractPartyKey(url));
}

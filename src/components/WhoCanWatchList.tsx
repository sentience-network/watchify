"use client";

import Link from "next/link";
import { whoCanWatchTitle, serviceLabel } from "@/lib/service-access";
import { getMovie } from "@/lib/movies";
import { getUser } from "@/lib/users";
import type { StreamingServiceId } from "@/lib/streaming";
import type { WatchParty } from "@/lib/types";

export function WhoCanWatchList({
  movieId,
  hostService,
  syncMode,
  friendIds,
}: {
  movieId: string;
  hostService?: StreamingServiceId | null;
  syncMode: WatchParty["syncMode"];
  friendIds: string[];
}) {
  const movie = getMovie(movieId);
  if (!movieId || !friendIds.length) return null;

  const friends = friendIds.map((id) => getUser(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof getUser>
  >[];

  const can = whoCanWatchTitle({
    movie,
    hostService,
    friends,
    syncMode,
  });

  if (syncMode === "watchify_free") {
    return (
      <p className="mt-2 text-[11px] text-mist/70">
        Watchify Free — any friend can sync in-app (no paid streamer required).
      </p>
    );
  }

  if (!can.length) {
    return (
      <p className="mt-2 text-[11px] text-amber-soft/90">
        None of your friends have overlapping linked services for this title yet.
        Invite them to link badges in Settings — or pick a Watchify Free title.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-line/70 bg-ink/30 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-teal">
        Who can watch this
      </p>
      <ul className="mt-1.5 space-y-1">
        {can.slice(0, 8).map(({ user, via }) => (
          <li key={user.id} className="flex flex-wrap items-center gap-2 text-xs text-mist">
            <Link href={`/profile/${user.id}`} className="font-medium text-white hover:text-teal-soft">
              {user.name}
            </Link>
            {via.length ? (
              <span className="text-mist/60">
                · {via.map(serviceLabel).join(", ")}
              </span>
            ) : (
              <span className="text-mist/60">· Free / any</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[10px] text-mist/55">
        Based on linked service badges — not live entitlements. Each person still
        uses their own account.
      </p>
    </div>
  );
}

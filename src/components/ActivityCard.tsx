"use client";

import Link from "next/link";
import type { Activity } from "@/lib/types";
import { getMovie } from "@/lib/movies";
import { getUser } from "@/lib/users";
import { activityShareUrl } from "@/lib/share";
import {
  openOnServiceUrl,
  whereToWatchUrl,
} from "@/lib/streaming";
import { MoviePoster } from "./MoviePoster";
import { ServiceBadge } from "./ServiceBadge";
import { ShareMenu } from "./ShareMenu";

const labels: Record<Activity["type"], string> = {
  watching: "is watching",
  watchlist_add: "added to a watchlist",
  finished: "finished",
  party_created: "started a watch party for",
  party_joined: "joined a party for",
  friend_added: "made a new friend while watching",
};

export function ActivityCard({ activity }: { activity: Activity }) {
  const user = getUser(activity.userId);
  const movie = getMovie(activity.movieId);
  if (!user || !movie) return null;

  const url =
    typeof window !== "undefined"
      ? activityShareUrl(activity.id)
      : `/share/activity/${activity.id}`;

  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-panel/50 p-4 animate-fade-up">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink"
        style={{
          background: `hsl(${user.avatarHue} 70% 55%)`,
        }}
      >
        {user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm text-mist">
            <Link
              href={`/profile/${user.id}`}
              className="font-semibold text-white hover:text-teal-soft"
            >
              {user.name}
            </Link>{" "}
            {labels[activity.type]}{" "}
            <span className="font-medium text-white">{movie.title}</span>
            {activity.serviceId && (
              <>
                {" "}
                on <ServiceBadge serviceId={activity.serviceId} />
              </>
            )}
            {activity.partyId && activity.type === "party_created" && (
              <>
                {" · "}
                <Link
                  href="/parties"
                  className="text-teal-soft hover:underline"
                >
                  See parties
                </Link>
              </>
            )}
          </p>
          <ShareMenu
            compact
            url={url}
            title={`${user.name} on Watchify`}
            text={`${user.name} ${labels[activity.type]} ${movie.title} on Watchify`}
          />
        </div>
        <p className="mt-1 text-xs text-mist/60">
          {new Date(activity.createdAt).toLocaleString()}
          {typeof activity.progressPercent === "number"
            ? ` · ${activity.progressPercent}% in`
            : ""}
        </p>
        {(activity.type === "watching" || activity.type === "party_created") && (
          <p className="mt-1 text-[11px] text-mist/55">
            Friends can follow this for free — no streaming membership required
            for the social share.{" "}
            {activity.serviceId ? (
              <a
                href={openOnServiceUrl(activity.serviceId, movie.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-soft hover:underline"
              >
                Open on service
              </a>
            ) : (
              <a
                href={whereToWatchUrl(movie.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-soft hover:underline"
              >
                Where to watch
              </a>
            )}
          </p>
        )}
        <div className="mt-3">
          <MoviePoster movie={movie} size="sm" />
        </div>
      </div>
    </article>
  );
}

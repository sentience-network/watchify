"use client";

import Link from "next/link";
import type { Activity } from "@/lib/types";
import { getMovie } from "@/lib/movies";
import { resolveDirectoryUser } from "@/lib/users";
import { activityShareUrl } from "@/lib/share";
import {
  openOnServiceUrl,
  whereToWatchUrl,
} from "@/lib/streaming";
import { useWatchify } from "@/lib/store";
import { MoviePoster } from "./MoviePoster";
import { ProfileAvatar } from "./ProfileAvatar";
import { ServiceBadge } from "./ServiceBadge";
import { ShareMenu } from "./ShareMenu";

const labels: Record<Activity["type"], string> = {
  watching: "is watching",
  watchlist_add: "added to a watchlist",
  finished: "finished",
  party_created: "started a watch party for",
  party_joined: "joined a party for",
  friend_added: "made a new friend while watching",
  post: "posted",
};

type Props = {
  activity: Activity;
  /** Highlight newly arrived live items */
  isNew?: boolean;
};

export function ActivityCard({ activity, isNew }: Props) {
  const { directoryUsers } = useWatchify();
  const user = resolveDirectoryUser(activity.userId, directoryUsers);
  const movie = activity.movieId ? getMovie(activity.movieId) : undefined;
  if (!user) return null;
  if (activity.type !== "post" && !movie) return null;
  if (activity.type === "post" && !activity.text && !movie) return null;

  const url =
    typeof window !== "undefined"
      ? activityShareUrl(activity.id)
      : `/share/activity/${activity.id}`;

  const partyHref = activity.partyId
    ? `/parties/${activity.partyId}`
    : "/parties";

  const shareText =
    activity.type === "post"
      ? `${user.name}: ${activity.text || ""}${movie ? ` (${movie.title})` : ""}`
      : `${user.name} ${labels[activity.type]} ${movie?.title || ""} on Watchify`;

  return (
    <article
      className={`flex gap-4 rounded-2xl border bg-panel/50 p-4 animate-fade-up ${
        isNew
          ? "border-teal/45 shadow-[0_0_0_1px_rgba(45,212,191,0.12)]"
          : "border-line"
      }`}
    >
      <Link href={`/profile/${user.id}`} className="shrink-0">
        <ProfileAvatar
          name={user.name}
          hue={user.avatarHue}
          avatarUrl={user.avatarUrl}
          size="sm"
          ringColor={user.accentColor}
          frame={user.avatarFrame}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 text-sm text-mist">
            <Link
              href={`/profile/${user.id}`}
              className="font-semibold text-white hover:text-teal-soft"
            >
              {user.name}
            </Link>{" "}
            {activity.type === "post" ? (
              <>
                <span className="text-mist/70">shared</span>
                {activity.text && (
                  <p className="mt-1.5 text-[15px] leading-snug text-white">
                    {activity.text}
                  </p>
                )}
                {movie && (
                  <p className="mt-1 text-xs text-mist/75">
                    about{" "}
                    <Link
                      href={`/discover?q=${encodeURIComponent(movie.title)}`}
                      className="font-medium text-teal-soft hover:underline"
                    >
                      {movie.title}
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <>
                {labels[activity.type]}{" "}
                {movie && (
                  <Link
                    href={`/discover?q=${encodeURIComponent(movie.title)}`}
                    className="font-medium text-white hover:text-teal-soft"
                  >
                    {movie.title}
                  </Link>
                )}
                {activity.serviceId && (
                  <>
                    {" "}
                    on <ServiceBadge serviceId={activity.serviceId} />
                  </>
                )}
                {activity.partyId &&
                  (activity.type === "party_created" ||
                    activity.type === "party_joined") && (
                    <>
                      {" · "}
                      <Link
                        href={partyHref}
                        className="text-teal-soft hover:underline"
                      >
                        Open party
                      </Link>
                    </>
                  )}
              </>
            )}
          </div>
          <ShareMenu
            compact
            url={url}
            title={`${user.name} on Watchify`}
            text={shareText}
          />
        </div>
        <p className="mt-1 text-xs text-mist/60">
          {isNew && (
            <span className="mr-1.5 inline-flex items-center gap-1 text-teal-soft">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal animate-live-glow" />
              Live
            </span>
          )}
          {new Date(activity.createdAt).toLocaleString()}
          {typeof activity.progressPercent === "number"
            ? ` · ${activity.progressPercent}% in`
            : ""}
          {activity.visibility === "public" ? " · Discover" : ""}
        </p>
        {(activity.type === "watching" || activity.type === "party_created") &&
          movie && (
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
        {movie && (
          <div className="mt-3">
            <MoviePoster movie={movie} size="sm" />
          </div>
        )}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ShareMenu } from "@/components/ShareMenu";
import {
  estimateWatchPosition,
  formatRelativeStarted,
  formatWatchStartedAt,
} from "@/lib/deep-links";
import { isFreePlayable } from "@/lib/free-content";
import { prisma } from "@/lib/db";
import { getMovie, posterUrl } from "@/lib/movies";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getUser } from "@/lib/users";

type Props = { params: { id: string } };

async function loadWatcher(id: string) {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      handle: true,
      publicWatching: true,
      currentlyWatchingId: true,
      currentlyWatchingServiceId: true,
      watchingProgressPercent: true,
      watchingStartedAt: true,
    },
  });
  if (row) return row;
  const demo = getUser(id);
  if (!demo) return null;
  return {
    id: demo.id,
    name: demo.name,
    handle: demo.handle,
    publicWatching: true,
    currentlyWatchingId: demo.currentlyWatchingId,
    currentlyWatchingServiceId: demo.currentlyWatchingServiceId ?? null,
    watchingProgressPercent: demo.watchingProgressPercent ?? null,
    watchingStartedAt: demo.watchingStartedAt
      ? new Date(demo.watchingStartedAt)
      : null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await loadWatcher(params.id);
  const movie =
    user?.publicWatching && user.currentlyWatchingId
      ? getMovie(user.currentlyWatchingId)
      : undefined;
  const title = user
    ? `${user.name} is watching${movie ? ` ${movie.title}` : ""}`
    : "Watching now";
  const description =
    user && movie
      ? `See what ${user.name} (@${user.handle}) is watching on Watchify: ${movie.title}.`
      : "See what friends are watching on Watchify.";
  return buildPageMetadata({
    title,
    description,
    path: `/share/watching/${params.id}`,
    image: movie ? posterUrl(movie, "w500") : null,
    type: "profile",
  });
}

export default async function ShareWatchingPage({ params }: Props) {
  const user = await loadWatcher(params.id);
  const movie =
    user?.publicWatching && user.currentlyWatchingId
      ? getMovie(user.currentlyWatchingId)
      : undefined;
  const url = absoluteUrl(`/share/watching/${params.id}`);
  const startedAt = user?.watchingStartedAt?.toISOString() ?? null;
  const position = movie
    ? estimateWatchPosition({
        watchingStartedAt: startedAt,
        progressPercent: user?.watchingProgressPercent,
        runtimeMinutes: movie.runtime,
      })
    : null;
  const free = movie ? isFreePlayable(movie) : false;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <p className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </p>
      <h1 className="mt-6 font-display text-3xl font-bold text-white">
        Watching now
      </h1>
      {user && movie ? (
        <div className="mt-6 rounded-2xl border border-line bg-panel/50 p-5">
          <p className="text-sm text-mist">
            <span className="font-semibold text-white">{user.name}</span> is
            watching
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-white">
            {movie.title}
          </p>
          <p className="mt-1 text-sm text-mist/70">
            {movie.year} · {movie.genres.slice(0, 2).join(" · ")}
            {free ? " · Free on Watchify" : ""}
          </p>
          {startedAt || position ? (
            <div className="mt-3 rounded-lg border border-teal/25 bg-teal/10 px-3 py-2 text-sm">
              {startedAt ? (
                <p className="text-white">
                  Started at{" "}
                  <span className="font-semibold text-teal-soft">
                    {formatWatchStartedAt(startedAt)}
                  </span>
                  <span className="text-mist/65">
                    {" "}
                    ({formatRelativeStarted(startedAt)})
                  </span>
                </p>
              ) : null}
              {position ? (
                <p className="mt-0.5 text-mist">
                  Join around{" "}
                  <span className="font-semibold text-white">
                    {position.label}
                  </span>
                  {position.percent !== null
                    ? ` · ~${position.percent}%`
                    : ""}
                </p>
              ) : null}
              {!free ? (
                <p className="mt-1 text-[11px] leading-relaxed text-mist/55">
                  Timing cue only — open the title on your own service and scrub
                  to match. Watchify does not stream paid apps.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ShareMenu
              url={url}
              title={`${user.name} on Watchify`}
              text={
                startedAt && position
                  ? `${user.name} started ${movie.title} at ${formatWatchStartedAt(startedAt)} — join around ${position.label}`
                  : `${user.name} is watching ${movie.title} on Watchify`
              }
            />
            {free ? (
              <Link
                href={`/watch/${movie.id}`}
                className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-ink"
              >
                Watch free
              </Link>
            ) : null}
            <Link
              href={`/parties?create=1&movieId=${encodeURIComponent(movie.id)}&syncMode=${free ? "watchify_free" : "own_account"}`}
              className="rounded-lg border border-teal/40 px-3 py-2 text-sm font-medium text-teal-soft"
            >
              Start party
            </Link>
            <Link
              href={`/profile/${user.id}`}
              className="rounded-lg border border-line px-3 py-2 text-sm text-mist hover:text-white"
            >
              View profile
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-mist">Nothing public to share for this profile.</p>
      )}
    </main>
  );
}

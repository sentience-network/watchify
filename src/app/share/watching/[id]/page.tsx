import type { Metadata } from "next";
import Link from "next/link";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie, posterUrl } from "@/lib/movies";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getUser } from "@/lib/users";

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const user = getUser(params.id);
  const movie = user?.currentlyWatchingId
    ? getMovie(user.currentlyWatchingId)
    : undefined;
  const title = user
    ? `${user.name} is watching${movie ? ` ${movie.title}` : ""}`
    : "Watching now";
  const description = user && movie
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

export default function ShareWatchingPage({ params }: Props) {
  const user = getUser(params.id);
  const movie = user?.currentlyWatchingId
    ? getMovie(user.currentlyWatchingId)
    : undefined;
  const url = absoluteUrl(`/share/watching/${params.id}`);

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
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShareMenu
              url={url}
              title={`${user.name} on Watchify`}
              text={`${user.name} is watching ${movie.title} on Watchify`}
            />
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

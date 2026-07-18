import type { Metadata } from "next";
import { getMovie, posterUrl } from "@/lib/movies";
import { buildPageMetadata } from "@/lib/seo";
import { SEED_WATCHLISTS, getUser } from "@/lib/users";

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const list = SEED_WATCHLISTS.find((w) => w.id === params.id);
  const owner = list ? getUser(list.ownerId) : undefined;
  const first = list?.movieIds[0] ? getMovie(list.movieIds[0]) : undefined;
  return buildPageMetadata({
    title: list ? list.name : "Watchlist",
    description: list
      ? `${list.description || list.name} — shared watchlist${owner ? ` by ${owner.name}` : ""} on Watchify.`
      : "Shared Watchify watchlist",
    path: `/share/watchlist/${params.id}`,
    image: first ? posterUrl(first, "w500") : null,
  });
}

export default function ShareWatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

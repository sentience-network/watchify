import type { Metadata } from "next";
import { getMovie, posterUrl } from "@/lib/movies";
import { buildPageMetadata } from "@/lib/seo";
import { getUser } from "@/lib/users";

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const user = getUser(params.id);
  const movie = user?.currentlyWatchingId
    ? getMovie(user.currentlyWatchingId)
    : undefined;
  return buildPageMetadata({
    title: user ? `${user.name} (@${user.handle})` : "Profile",
    description: user
      ? `${user.bio} See what ${user.name} is watching on Watchify.`
      : "Watchify profile",
    path: `/profile/${params.id}`,
    image: movie ? posterUrl(movie, "w500") : null,
    type: "profile",
  });
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

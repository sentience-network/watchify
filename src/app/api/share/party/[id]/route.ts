import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMovie } from "@/lib/movies";

type Props = { params: { id: string } };

/** Lightweight public party snapshot for OG / edge renderers. */
export async function GET(_req: Request, { params }: Props) {
  const party = await prisma.party.findFirst({
    where: {
      OR: [{ inviteCode: params.id }, { id: params.id, visibility: "public" }],
    },
    include: { host: { select: { name: true } } },
  });
  if (!party) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const movie = getMovie(party.movieId);
  return NextResponse.json({
    name: party.name,
    hostName: party.host.name,
    movieTitle: movie?.title || null,
    isLive: party.isLive,
    status: party.status,
  });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMovie } from "@/lib/movies";
import { createPartyDb } from "@/lib/server/social-db";
import {
  getOrCreateConversationDb,
  sendDirectMessageDb,
} from "@/lib/server/messages-db";
import { recordEvent } from "@/lib/server/analytics";
import { sanitizeText } from "@/lib/sanitize";
import { isFreePlayable } from "@/lib/free-content";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * One-tap “Watch with us” from presence: create (or reuse) a live party for a title
 * and DM-invite the friend who is watching / relevant friends.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: {
    movieId?: string;
    friendUserId?: string;
    inviteFriendIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const movieId = sanitizeText(body.movieId || "", 80);
  const movie = getMovie(movieId);
  if (!movie) {
    return NextResponse.json({ error: "Title not found" }, { status: 400 });
  }

  // Reuse an open live party for same host+title
  const existing = await prisma.party.findFirst({
    where: {
      hostId: session.user.id,
      movieId,
      status: "open",
      isLive: true,
    },
    include: { members: true },
    orderBy: { createdAt: "desc" },
  });

  let partyId = existing?.id;
  let inviteCode = existing?.inviteCode || existing?.id;
  if (!existing) {
    const created = await createPartyDb(session.user.id, {
      name: `Watch with us · ${movie.title}`.slice(0, 80),
      movieId,
      startsAt: null,
      isLive: true,
      syncMode: isFreePlayable(movie) ? "watchify_free" : "own_account",
      serviceId: null,
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }
    partyId = created.value.id;
    inviteCode = created.value.inviteCode || created.value.id;
  }

  const inviteUrl = absoluteUrl(`/share/party/${inviteCode}`);
  const targets = Array.from(
    new Set(
      [body.friendUserId, ...(body.inviteFriendIds || [])].filter(
        (id): id is string => Boolean(id) && id !== session.user.id
      )
    )
  ).slice(0, 8);

  const invited: string[] = [];
  for (const friendId of targets) {
    try {
      const conv = await getOrCreateConversationDb(session.user.id, friendId);
      if ("error" in conv) continue;
      const sent = await sendDirectMessageDb(
        session.user.id,
        conv.conversationId,
        `Watch with us — jump into my room for ${movie.title}?`,
        inviteUrl
      );
      if (!("error" in sent)) invited.push(friendId);
    } catch {
      /* skip blocked / missing */
    }
  }

  if (!existing) {
    await recordEvent("party_created", {
      userId: session.user.id,
      properties: {
        partyId: partyId!,
        source: "watch_with_us",
        mode: isFreePlayable(movie) ? "watchify_free" : "own_account",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    partyId,
    inviteUrl,
    invited,
    reused: Boolean(existing),
  });
}

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  addPartyReactionDb,
  postPartyMessageDb,
  updatePartyPlaybackDb,
} from "@/lib/server/social-db";
import { prisma } from "@/lib/db";
import { recordEvent } from "@/lib/server/analytics";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [messages, reactions, playback] = await Promise.all([
    prisma.partyMessage.findMany({
      where: { partyId: params.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.partyReaction.findMany({
      where: { partyId: params.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.partyPlaybackSync.findUnique({ where: { partyId: params.id } }),
  ]);
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      partyId: m.partyId,
      userId: m.userId,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
    reactions: reactions.map((r) => ({
      id: r.id,
      partyId: r.partyId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    })),
    playback: playback
      ? {
          partyId: playback.partyId,
          positionSec: playback.positionSec,
          playing: playback.playing,
          watchStartedAt: playback.watchStartedAt?.toISOString() ?? null,
          updatedAt: playback.updatedAt.toISOString(),
          updatedBy: playback.updatedBy,
        }
      : null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: {
    text?: string;
    emoji?: string;
    positionSec?: number;
    playing?: boolean;
    startTracker?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.text !== undefined) {
    const result = await postPartyMessageDb(auth.userId, params.id, body.text);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const prior = await prisma.partyMessage.count({ where: { userId: auth.userId } });
    if (prior === 1) await recordEvent("first_message", { userId: auth.userId, properties: { partyId: params.id } });
    return NextResponse.json(result);
  }
  if (body.emoji) {
    const result = await addPartyReactionDb(auth.userId, params.id, body.emoji);
    return NextResponse.json(result);
  }
  if (
    body.startTracker ||
    (body.positionSec !== undefined && body.playing !== undefined)
  ) {
    const result = await updatePartyPlaybackDb(
      auth.userId,
      params.id,
      body.positionSec ?? 0,
      body.playing ?? true,
      { startTracker: Boolean(body.startTracker) }
    );
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Nothing to post" }, { status: 400 });
}

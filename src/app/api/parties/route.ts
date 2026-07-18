import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import {
  createPartyDb,
  endPartyDb,
  joinPartyByInviteDb,
  requestJoinPartyDb,
} from "@/lib/server/social-db";
import { prisma } from "@/lib/db";
import type { StreamingServiceId } from "@/lib/streaming";
import type { WatchParty } from "@/lib/types";
import { recordEvent } from "@/lib/server/analytics";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function mapParty(row: {
  id: string;
  name: string;
  hostId: string;
  movieId: string;
  startsAt: Date | null;
  isLive: boolean;
  status: string;
  createdAt: Date;
  serviceId: string | null;
  syncMode: string;
  coHostIdsJson: string;
  recurringWeekly: boolean;
  inviteCode: string;
  inviteExpiresAt: Date | null;
  inviteRevokedAt: Date | null;
  visibility: string;
  maxMembers: number;
  members: { userId: string }[];
}): WatchParty {
  let coHostIds: string[] = [];
  try {
    coHostIds = JSON.parse(row.coHostIdsJson) as string[];
  } catch {
    coHostIds = [];
  }
  return {
    id: row.id,
    name: row.name,
    hostId: row.hostId,
    movieId: row.movieId,
    startsAt: row.startsAt?.toISOString() ?? null,
    isLive: row.isLive,
    memberIds: row.members.map((m) => m.userId),
    status: row.status as WatchParty["status"],
    createdAt: row.createdAt.toISOString(),
    serviceId: row.serviceId as StreamingServiceId | null,
    syncMode: row.syncMode as WatchParty["syncMode"],
    coHostIds,
    recurringWeekly: row.recurringWeekly,
    inviteCode: row.inviteCode,
    inviteExpiresAt: row.inviteExpiresAt?.toISOString() ?? null,
    inviteRevokedAt: row.inviteRevokedAt?.toISOString() ?? null,
    visibility: row.visibility as "public" | "private",
    maxMembers: row.maxMembers,
  };
}

export async function GET() {
  const rows = await prisma.party.findMany({
    where: { status: "open", visibility: "public" },
    include: { members: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ parties: rows.map(mapParty) });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  let body: {
    name?: string;
    movieId?: string;
    startsAt?: string | null;
    isLive?: boolean;
    serviceId?: StreamingServiceId | null;
    syncMode?: WatchParty["syncMode"];
    coHostIds?: string[];
    recurringWeekly?: boolean;
    action?: "join" | "join_invite" | "refresh_invite" | "revoke_invite";
    partyId?: string;
    invite?: string;
    endPartyId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.endPartyId) {
    const result = await endPartyDb(auth.userId, body.endPartyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if ((body.action === "refresh_invite" || body.action === "revoke_invite") && body.partyId) {
    const party = await prisma.party.findUnique({ where: { id: body.partyId } });
    if (!party || party.hostId !== auth.userId) {
      return NextResponse.json({ error: "Only the host can manage invites" }, { status: 403 });
    }
    const updated = await prisma.party.update({
      where: { id: party.id },
      data: body.action === "revoke_invite"
        ? { inviteRevokedAt: new Date() }
        : { inviteCode: randomUUID(), inviteRevokedAt: null, inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000) },
      include: { members: true },
    });
    return NextResponse.json({ party: mapParty(updated) });
  }

  if (body.action === "join_invite" && (body.invite || body.partyId)) {
    const result = await joinPartyByInviteDb(
      auth.userId,
      body.invite || body.partyId || ""
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!result.alreadyMember) await recordEvent("party_joined", { userId: auth.userId, properties: { partyId: result.party.id, source: "invite" } });
    return NextResponse.json(result);
  }

  if (body.action === "join" && body.partyId) {
    const result = await requestJoinPartyDb(auth.userId, body.partyId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (!body.movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }
  const result = await createPartyDb(auth.userId, {
    name: body.name || "",
    movieId: body.movieId,
    startsAt: body.startsAt ?? null,
    isLive: Boolean(body.isLive),
    serviceId: body.serviceId,
    syncMode: body.syncMode,
    coHostIds: body.coHostIds,
    recurringWeekly: body.recurringWeekly,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  await recordEvent("party_created", { userId: auth.userId, properties: { partyId: result.value.id, mode: result.value.syncMode || "social" } });
  return NextResponse.json({ party: result.value });
}

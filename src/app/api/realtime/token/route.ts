import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { prisma } from "@/lib/db";
import {
  realtimePublicUrl,
  signRealtimeToken,
} from "@/lib/realtime-token";

export const runtime = "nodejs";

/** Issue a short-lived room token after verifying DB membership. */
export async function POST(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  let body: { partyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }

  const [user, party] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.userId } }),
    prisma.party.findUnique({
      where: { id: body.partyId },
      include: { members: { where: { userId: auth.userId }, take: 1 } },
    }),
  ]);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!party || party.status !== "open") {
    return NextResponse.json({ error: "Party not open" }, { status: 404 });
  }

  let coHosts: string[] = [];
  try {
    coHosts = JSON.parse(party.coHostIdsJson) as string[];
  } catch {
    coHosts = [];
  }
  const isMember =
    party.hostId === auth.userId ||
    coHosts.includes(auth.userId) ||
    party.members.length > 0;
  if (!isMember) {
    return NextResponse.json({ error: "Not a party member" }, { status: 403 });
  }

  const token = signRealtimeToken({
    userId: user.id,
    partyId: party.id,
    name: user.name,
    handle: user.handle,
  });

  return NextResponse.json({
    token,
    url: realtimePublicUrl(),
    partyId: party.id,
  });
}

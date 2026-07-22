import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export const FUNNEL_EVENTS = [
  "landing_view", "signup_started", "signup_completed", "presence_shared",
  "party_created", "invite_copied", "invite_opened", "party_joined",
  "first_message", "return_visit",
  // Soft-launch depth funnel
  "video_joined", "ready_status", "scrub_opened", "d1_return", "invite_depth",
  "guest_joined", "watch_with_us", "party_multi",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Soft-launch targets from docs/LAUNCH_2_WEEKS.md */
export const LAUNCH_TARGETS = {
  inviteToJoinPct: 35,
  roomsMultiPct: 40,
  d1ReturnPct: 25,
  inviteDepthMin: 2,
} as const;

export async function recordEvent(
  name: FunnelEvent,
  input: { userId?: string | null; sessionId?: string | null; properties?: Record<string, string | number | boolean | null> } = {}
) {
  const allowed = new Set([
    "partyId",
    "source",
    "mode",
    "authenticated",
    "newUser",
    "status",
    "depth",
    "day",
  ]);
  const properties = Object.fromEntries(
    Object.entries(input.properties || {}).filter(([key]) => allowed.has(key))
  );
  const sessionHash = input.sessionId
    ? createHash("sha256").update(`${process.env.NEXTAUTH_SECRET || "local"}:${input.sessionId}`).digest("hex")
    : null;
  await prisma.analyticsEvent.create({
    data: { name, userId: input.userId || null, sessionHash, propertiesJson: JSON.stringify(properties) },
  });
}

export async function funnelCounts(since: Date) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["name"], where: { createdAt: { gte: since } }, _count: { _all: true },
  });
  const counts = Object.fromEntries(FUNNEL_EVENTS.map((name) => [name, 0])) as Record<FunnelEvent, number>;
  for (const row of rows) if (row.name in counts) counts[row.name as FunnelEvent] = row._count._all;
  return counts;
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

/**
 * Pitch-ready metrics vs LAUNCH_2_WEEKS targets (real DB + funnel events only).
 */
export async function pitchMetrics(since: Date) {
  const counts = await funnelCounts(since);

  const parties = await prisma.party.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      hostId: true,
      _count: { select: { members: true } },
    },
  });
  const roomsCreated = parties.length;
  const roomsMulti = parties.filter((p) => {
    // host is not always in members; count unique people as members + host
    const memberCount = p._count.members;
    // members usually include host; treat ≥2 members as multi-person room
    return memberCount >= 2;
  }).length;

  // Max invite depth seen in events (properties.depth)
  const depthRows = await prisma.analyticsEvent.findMany({
    where: { name: "invite_depth", createdAt: { gte: since } },
    select: { propertiesJson: true },
    take: 500,
  });
  let maxInviteDepth = 0;
  for (const row of depthRows) {
    try {
      const props = JSON.parse(row.propertiesJson || "{}") as { depth?: number };
      if (typeof props.depth === "number" && props.depth > maxInviteDepth) {
        maxInviteDepth = props.depth;
      }
    } catch {
      /* ignore */
    }
  }

  const inviteOpened = counts.invite_opened;
  // party_joined already includes server guest-join; don't add guest_joined (client) or double-count
  const partyJoined = counts.party_joined;
  const d1Returns = counts.d1_return;
  // Prefer event-based multi if recorded; else DB count
  const multiRooms = counts.party_multi > 0 ? counts.party_multi : roomsMulti;

  const inviteToJoinPct = pct(partyJoined, inviteOpened);
  const roomsMultiPct = pct(multiRooms, roomsCreated || counts.party_created);
  const d1ReturnPct = pct(d1Returns, partyJoined);

  const metrics = {
    inviteToJoin: {
      label: "Invite → join",
      valuePct: inviteToJoinPct,
      targetPct: LAUNCH_TARGETS.inviteToJoinPct,
      hit: inviteToJoinPct >= LAUNCH_TARGETS.inviteToJoinPct,
      numerator: partyJoined,
      denominator: inviteOpened,
      note: "party_joined / invite_opened (includes guest joins)",
    },
    roomsMulti: {
      label: "Rooms with ≥2 people",
      valuePct: roomsMultiPct,
      targetPct: LAUNCH_TARGETS.roomsMultiPct,
      hit: roomsMultiPct >= LAUNCH_TARGETS.roomsMultiPct,
      numerator: multiRooms,
      denominator: roomsCreated || counts.party_created,
      note: "parties with ≥2 members (DB) or party_multi events",
    },
    d1Return: {
      label: "D1 return",
      valuePct: d1ReturnPct,
      targetPct: LAUNCH_TARGETS.d1ReturnPct,
      hit: d1ReturnPct >= LAUNCH_TARGETS.d1ReturnPct,
      numerator: d1Returns,
      denominator: partyJoined,
      note: "strict dayGap===1 returns / joiners",
    },
    inviteDepth: {
      label: "Invite depth (max)",
      value: maxInviteDepth,
      target: LAUNCH_TARGETS.inviteDepthMin,
      hit: maxInviteDepth >= LAUNCH_TARGETS.inviteDepthMin,
      note: "max depth property on invite_depth events (A→B→C = 2)",
    },
  };

  return { counts, metrics, roomsCreated, roomsMulti: multiRooms };
}

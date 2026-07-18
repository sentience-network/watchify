import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export const FUNNEL_EVENTS = [
  "landing_view", "signup_started", "signup_completed", "presence_shared",
  "party_created", "invite_copied", "invite_opened", "party_joined",
  "first_message", "return_visit",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export async function recordEvent(
  name: FunnelEvent,
  input: { userId?: string | null; sessionId?: string | null; properties?: Record<string, string | number | boolean | null> } = {}
) {
  const allowed = new Set(["partyId", "source", "mode", "authenticated", "newUser"]);
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

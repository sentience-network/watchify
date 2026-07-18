import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { funnelCounts } from "@/lib/server/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public launch pulse for landing — real DB counts, never invented marketing numbers. */
export async function GET() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [counts, openParties, membersWeek] = await Promise.all([
    funnelCounts(weekAgo),
    prisma.party.count({ where: { status: "open" } }),
    prisma.partyMember.count({ where: { joinedAt: { gte: weekAgo } } }),
  ]);

  const partyJoinsThisWeek = Math.max(counts.party_joined, membersWeek);

  return NextResponse.json({
    partyJoinsThisWeek,
    openParties,
    partiesCreatedThisWeek: counts.party_created,
    presenceSharesThisWeek: counts.presence_shared,
  });
}

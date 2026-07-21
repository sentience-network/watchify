import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { dispatchPartyReminders } from "@/lib/server/reminders";

export const dynamic = "force-dynamic";

/**
 * Server-side party reminders (T−24h / T−1h / live).
 * Auth: Bearer/CRON_SECRET, or any signed-in user (soft-launch opportunistic tick).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const q = url.searchParams.get("secret") || "";
  const cronOk = Boolean(secret && (bearer === secret || q === secret));
  const session = cronOk ? null : await getServerSession(authOptions);
  if (secret && !cronOk && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!secret && !session?.user?.id && !cronOk) {
    // Local/dev without CRON_SECRET: allow anonymous tick for ops testing
  }

  const partyId = url.searchParams.get("partyId") || undefined;
  const forceLive = url.searchParams.get("live") === "1";
  const result = await dispatchPartyReminders({ partyId, forceLive });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}

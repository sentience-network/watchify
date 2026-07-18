import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { FUNNEL_EVENTS, recordEvent, type FunnelEvent } from "@/lib/server/analytics";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    name?: string; sessionId?: string; properties?: Record<string, string | number | boolean | null>;
  };
  if (!body.name || !FUNNEL_EVENTS.includes(body.name as FunnelEvent)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  await recordEvent(body.name as FunnelEvent, {
    userId: session?.user?.id,
    sessionId: body.sessionId,
    properties: body.properties,
  });
  return NextResponse.json({ ok: true });
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  type PushSubscriptionJSON,
} from "@/lib/server/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: Boolean(getVapidPublicKey()),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: { subscription?: PushSubscriptionJSON; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.action === "unsubscribe" && body.subscription?.endpoint) {
    await removePushSubscription(session.user.id, body.subscription.endpoint);
    return NextResponse.json({ ok: true });
  }
  if (!body.subscription) {
    return NextResponse.json({ error: "subscription required" }, { status: 400 });
  }
  const saved = await savePushSubscription(session.user.id, body.subscription);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

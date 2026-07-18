import { NextResponse } from "next/server";
import { openToken } from "@/lib/server/sealed-token";
import { exchangeTraktCode, syncTrakt } from "@/lib/server/trakt";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const destination = new URL("/settings", process.env.NEXT_PUBLIC_APP_URL || url.origin);
  try {
    if (!code || !state) throw new Error("Missing OAuth response");
    const payload = JSON.parse(openToken(state)) as { userId: string; expiresAt: number };
    if (!payload.userId || payload.expiresAt < Date.now()) throw new Error("OAuth request expired");
    await exchangeTraktCode(payload.userId, code);
    await syncTrakt(payload.userId);
    destination.searchParams.set("trakt", "connected");
  } catch (error) {
    destination.searchParams.set("trakt", "error");
    destination.searchParams.set("reason", error instanceof Error ? error.message.slice(0, 120) : "Connection failed");
  }
  return NextResponse.redirect(destination);
}

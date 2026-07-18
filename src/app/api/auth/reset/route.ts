import { NextResponse } from "next/server";
import { consumePasswordReset } from "@/lib/server/tokens";
import { rateLimitDurable } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`reset:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token || !body.password) {
    return NextResponse.json(
      { error: "Token and password required" },
      { status: 400 }
    );
  }

  const result = await consumePasswordReset(body.token, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

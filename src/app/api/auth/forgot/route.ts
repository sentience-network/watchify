import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/users-db";
import { issuePasswordReset } from "@/lib/server/tokens";
import { rateLimitDurable } from "@/lib/rate-limit";
import { isValidEmail, sanitizeEmail } from "@/lib/sanitize";

export const runtime = "nodejs";

/** Request a password reset email. Always returns ok (no enumeration). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`forgot:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = sanitizeEmail(body.email || "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  let previewUrl: string | undefined;
  if (user && !user.bannedAt) {
    const result = await issuePasswordReset(user.id, user.email);
    if (result.ok) previewUrl = result.previewUrl;
  }

  return NextResponse.json({
    ok: true,
    message: "If that email exists, a reset link was sent.",
    previewUrl,
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail, findUserById } from "@/lib/server/users-db";
import {
  consumeEmailVerification,
  issueEmailVerification,
} from "@/lib/server/tokens";
import { rateLimitDurable } from "@/lib/rate-limit";
import { isValidEmail, sanitizeEmail } from "@/lib/sanitize";

export const runtime = "nodejs";

/** Confirm email with token from link. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`verify:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const result = await consumeEmailVerification(body.token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, userId: result.userId });
}

/** Resend verification email (signed-in or by email). */
export async function PUT(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`verify-resend:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  let email = "";
  let userId = "";

  if (session?.user?.id) {
    const me = await findUserById(session.user.id);
    if (!me) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (me.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    email = me.email;
    userId = me.id;
  } else {
    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    email = sanitizeEmail(body.email || "");
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const user = await findUserByEmail(email);
    // Always return ok to avoid email enumeration
    if (!user || user.emailVerifiedAt) {
      return NextResponse.json({ ok: true });
    }
    userId = user.id;
  }

  const verify = await issueEmailVerification(userId, email);
  return NextResponse.json({
    ok: verify.ok,
    previewUrl: verify.ok ? verify.previewUrl : undefined,
    error: verify.ok ? undefined : verify.error,
  });
}

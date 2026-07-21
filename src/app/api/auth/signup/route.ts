import { NextResponse } from "next/server";
import { createUser, publicUser } from "@/lib/server/users-db";
import { issueEmailVerification } from "@/lib/server/tokens";
import { isValidEmail, sanitizeEmail, sanitizeHandle, sanitizeText } from "@/lib/sanitize";
import { rateLimitDurable } from "@/lib/rate-limit";
import { recordEvent } from "@/lib/server/analytics";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`signup:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many signups. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    handle?: string;
    ageConfirmed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = sanitizeEmail(body.email || "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!body.ageConfirmed) {
    return NextResponse.json(
      { error: "You must confirm you are 13 or older to use Watchify." },
      { status: 400 }
    );
  }

  const result = await createUser({
    email,
    password: body.password || "",
    name: sanitizeText(body.name || "", 80),
    handle: sanitizeHandle(body.handle || ""),
    ageConfirmed: true,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const verify = await issueEmailVerification(result.id, result.email);
  await recordEvent("signup_completed", { userId: result.id, properties: { source: "credentials", newUser: true } });

  return NextResponse.json({
    user: publicUser(result),
    partyTrialEndsAt: result.partyTrialEndsAt,
    partyTrialDays: 30,
    verificationSent: verify.ok,
    // Only present when email falls back to console (local soft launch)
    verificationPreviewUrl:
      verify.ok && "previewUrl" in verify ? verify.previewUrl : undefined,
  });
}

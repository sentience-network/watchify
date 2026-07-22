import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  convertGuestInPlace,
  linkGuestToExistingAccount,
  mergeGuestIntoUser,
  publicUser,
} from "@/lib/server/guest-convert";
import { isGuestEmail } from "@/lib/server/guests";
import { issueEmailVerification } from "@/lib/server/tokens";
import { recordEvent } from "@/lib/server/analytics";
import { rateLimitDurable } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

/**
 * Guest → real account:
 * - mode=upgrade (default): in-place convert (same user id, party history kept)
 * - mode=link: merge guest into an existing credentials account
 * - mode=claim: authenticated full user claims a prior guest id (cookie/OAuth path)
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = await rateLimitDurable(`guest-convert:${ip}`, 12, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: {
    mode?: "upgrade" | "link" | "claim";
    email?: string;
    password?: string;
    name?: string;
    handle?: string;
    guestId?: string;
    ageConfirmed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode || "upgrade";
  const session = await getServerSession(authOptions);

  if (mode === "claim") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    if (session.user.isGuest || isGuestEmail(session.user.email)) {
      return NextResponse.json(
        { error: "Already signed in as guest — use upgrade or link" },
        { status: 400 }
      );
    }
    const guestId = (body.guestId || "").trim();
    if (!guestId || !guestId.startsWith("g_")) {
      return NextResponse.json({ error: "Invalid guest session" }, { status: 400 });
    }
    const result = await mergeGuestIntoUser(guestId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await recordEvent("signup_completed", {
      userId: result.user.id,
      properties: { source: "guest_claim", newUser: false },
    });
    return NextResponse.json({
      ok: true,
      mode: "claim",
      user: publicUser(result.user),
      merged: true,
    });
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Guest session required — join a party as guest first" },
      { status: 401 }
    );
  }
  const isGuest =
    Boolean(session.user.isGuest) || isGuestEmail(session.user.email);
  if (!isGuest) {
    return NextResponse.json(
      { error: "Only guest sessions can convert this way" },
      { status: 400 }
    );
  }

  if (mode === "link") {
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    const result = await linkGuestToExistingAccount(
      session.user.id,
      body.email,
      body.password
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await recordEvent("signup_completed", {
      userId: result.user.id,
      properties: { source: "guest_link", newUser: false },
    });
    return NextResponse.json({
      ok: true,
      mode: "link",
      user: publicUser(result.user),
      email: result.user.email,
      merged: true,
    });
  }

  // upgrade
  if (!body.ageConfirmed) {
    return NextResponse.json(
      { error: "Confirm you are 13 or older." },
      { status: 400 }
    );
  }
  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const result = await convertGuestInPlace(session.user.id, {
    email: body.email,
    password: body.password,
    name: sanitizeText(body.name || "", 80),
    handle: body.handle,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const verify = await issueEmailVerification(result.user.id, result.user.email);
  await recordEvent("signup_completed", {
    userId: result.user.id,
    properties: { source: "guest_upgrade", newUser: true },
  });

  return NextResponse.json({
    ok: true,
    mode: "upgrade",
    user: publicUser(result.user),
    email: result.user.email,
    partyTrialEndsAt: result.user.partyTrialEndsAt,
    partyTrialDays: 30,
    verificationSent: verify.ok,
    verificationPreviewUrl:
      verify.ok && "previewUrl" in verify ? verify.previewUrl : undefined,
    merged: false,
    preservedUserId: true,
  });
}

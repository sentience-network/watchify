import { NextResponse } from "next/server";
import { guestJoinParty } from "@/lib/server/guests";
import { recordEvent } from "@/lib/server/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

/** Magic-link guest join: display name → guest session credentials + party member. */
export async function POST(req: Request) {
  const limited = rateLimit("guest-join:ip", 12, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many guest joins — try again later." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: {
    displayName?: string;
    invite?: string;
    ageConfirmed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invite = sanitizeText(body.invite || "", 64);
  if (!invite) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const result = await guestJoinParty({
    displayName: body.displayName || "",
    invite,
    ageConfirmed: Boolean(body.ageConfirmed),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await recordEvent("party_joined", {
    userId: result.userId,
    properties: { partyId: result.partyId, source: "guest_join", mode: "guest" },
  });

  return NextResponse.json({
    ok: true,
    email: result.email,
    password: result.password,
    partyId: result.partyId,
    userId: result.userId,
    guest: true,
    convertHint:
      "You’re in as a guest — create a real account anytime to keep friends and history.",
  });
}

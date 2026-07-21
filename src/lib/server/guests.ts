import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sanitizeText } from "@/lib/sanitize";
import { joinPartyByInviteDb } from "@/lib/server/social-db";
import type { AuthUserRecord } from "@/lib/server/users-db";

export const GUEST_EMAIL_DOMAIN = "guest.watchify.local";

export function isGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

function toAuthUser(row: {
  id: string;
  email: string;
  name: string;
  handle: string;
  passwordHash: string | null;
  ageVerified: boolean;
  plan: string;
  role: string;
  emailVerifiedAt: Date | null;
  bannedAt: Date | null;
  warnedAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  partyTrialEndsAt: Date | null;
  freeHostsRemaining: number;
  createdAt: Date;
  isGuest?: boolean;
}): AuthUserRecord & { isGuest: boolean } {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    handle: row.handle,
    passwordHash: row.passwordHash,
    ageConfirmed: row.ageVerified,
    plan: (row.plan as AuthUserRecord["plan"]) || "free",
    role: (row.role as AuthUserRecord["role"]) || "user",
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    bannedAt: row.bannedAt?.toISOString() ?? null,
    warnedAt: row.warnedAt?.toISOString() ?? null,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    partyTrialEndsAt: row.partyTrialEndsAt?.toISOString() ?? null,
    freeHostsRemaining: row.freeHostsRemaining ?? 0,
    createdAt: row.createdAt.toISOString(),
    isGuest: Boolean(row.isGuest),
  };
}

/** Create a short-lived guest account for party join without full signup. */
export async function createGuestUser(displayName: string): Promise<
  | { ok: true; user: AuthUserRecord & { isGuest: boolean }; password: string }
  | { ok: false; error: string }
> {
  const name = sanitizeText(displayName, 40) || "Guest";
  if (name.length < 2) {
    return { ok: false, error: "Enter a display name (at least 2 characters)." };
  }
  const password = randomBytes(18).toString("base64url");
  const suffix = randomBytes(4).toString("hex");
  const id = `g_${suffix}${Date.now().toString(36).slice(-4)}`;
  const email = `${id}@${GUEST_EMAIL_DOMAIN}`;
  let handle = `guest${suffix}`;
  let n = 0;
  while (await prisma.user.findUnique({ where: { handle } })) {
    n += 1;
    handle = `guest${suffix}${n}`;
  }

  const row = await prisma.user.create({
    data: {
      id,
      email,
      name,
      handle,
      passwordHash: await hash(password, 10),
      ageVerified: true,
      isGuest: true,
      plan: "free",
      partyTrialEndsAt: null,
      freeHostsRemaining: 0,
      role: "user",
      emailVerifiedAt: null,
      linkedServicesJson: "[]",
      socialLinksJson: "{}",
      recentlyWatchedIdsJson: "[]",
      publicWatching: false,
      avatarHue: Math.floor(Math.random() * 360),
    },
  });

  return { ok: true, user: toAuthUser(row), password };
}

export async function guestJoinParty(input: {
  displayName: string;
  invite: string;
  ageConfirmed: boolean;
}): Promise<
  | {
      ok: true;
      email: string;
      password: string;
      partyId: string;
      userId: string;
      alreadyMember?: boolean;
    }
  | { ok: false; error: string }
> {
  if (!input.ageConfirmed) {
    return { ok: false, error: "Confirm you are 13 or older to join as a guest." };
  }
  const created = await createGuestUser(input.displayName);
  if (!created.ok) return created;

  const joined = await joinPartyByInviteDb(created.user.id, input.invite);
  if ("error" in joined) {
    await prisma.user.delete({ where: { id: created.user.id } }).catch(() => undefined);
    return { ok: false, error: joined.error || "Could not join party" };
  }

  return {
    ok: true,
    email: created.user.email,
    password: created.password,
    partyId: joined.party.id,
    userId: created.user.id,
    alreadyMember: joined.alreadyMember,
  };
}

import { hash, compare } from "bcryptjs";
import { prisma } from "../db";
import type { PlanId } from "../plans";
import { sanitizeEmail, sanitizeHandle, sanitizeText } from "../sanitize";
import type { UserRole } from "../roles";
import { partyTrialEndsAtFromNow } from "../party-trial";
import { syncUserPlanEntitlements } from "./plan-entitlements";

export type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
  handle: string;
  passwordHash: string | null;
  ageConfirmed: boolean;
  plan: PlanId;
  role: UserRole;
  emailVerifiedAt: string | null;
  bannedAt: string | null;
  warnedAt: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  partyTrialEndsAt: string | null;
  freeHostsRemaining: number;
  createdAt: string;
};

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
}): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    handle: row.handle,
    passwordHash: row.passwordHash,
    ageConfirmed: row.ageVerified,
    plan: (row.plan as PlanId) || "free",
    role: (row.role as UserRole) || "user",
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    bannedAt: row.bannedAt?.toISOString() ?? null,
    warnedAt: row.warnedAt?.toISOString() ?? null,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    partyTrialEndsAt: row.partyTrialEndsAt?.toISOString() ?? null,
    freeHostsRemaining: row.freeHostsRemaining ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadAuthUser(idOrEmail: {
  id?: string;
  email?: string;
}): Promise<AuthUserRecord | null> {
  const row = idOrEmail.id
    ? await prisma.user.findUnique({ where: { id: idOrEmail.id } })
    : idOrEmail.email
      ? await prisma.user.findUnique({ where: { email: idOrEmail.email } })
      : null;
  if (!row) return null;
  await syncUserPlanEntitlements(row.id);
  const fresh = await prisma.user.findUnique({ where: { id: row.id } });
  return fresh ? toAuthUser(fresh) : null;
}

export async function findUserByEmail(
  email: string
): Promise<AuthUserRecord | null> {
  return loadAuthUser({ email: sanitizeEmail(email) });
}

export async function findUserById(
  id: string
): Promise<AuthUserRecord | null> {
  return loadAuthUser({ id });
}

/** New credential / OAuth signups get 30 days of Party. */
function newSignupTrialFields() {
  return {
    plan: "party" as const,
    partyTrialEndsAt: partyTrialEndsAtFromNow(),
    freeHostsRemaining: 1,
  };
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  handle: string;
  ageConfirmed: boolean;
}): Promise<AuthUserRecord | { error: string }> {
  if (!input.ageConfirmed) {
    return { error: "You must confirm you are 13 or older." };
  }
  const email = sanitizeEmail(input.email);
  if (!email.includes("@")) return { error: "Invalid email." };
  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { error: "An account with that email already exists." };
  }
  const handle =
    sanitizeHandle(input.handle) ||
    sanitizeHandle(email.split("@")[0] || "viewer");
  const existingHandle = await prisma.user.findUnique({ where: { handle } });
  if (existingHandle) {
    return { error: "That handle is taken." };
  }
  const id = `u_${Math.random().toString(36).slice(2, 10)}`;
  const trial = newSignupTrialFields();
  const row = await prisma.user.create({
    data: {
      id,
      email,
      name: sanitizeText(input.name, 80) || "Watcher",
      handle,
      passwordHash: await hash(input.password, 10),
      ageVerified: true,
      plan: trial.plan,
      partyTrialEndsAt: trial.partyTrialEndsAt,
      freeHostsRemaining: trial.freeHostsRemaining,
      role: "user",
      emailVerifiedAt: null,
      linkedServicesJson: "[]",
      socialLinksJson: "{}",
      recentlyWatchedIdsJson: "[]",
      publicWatching: true,
    },
  });
  return toAuthUser(row);
}

/** Upsert OAuth users into the DB (no password). OAuth emails are treated as verified. */
export async function upsertOAuthUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<AuthUserRecord | { error: string }> {
  const email = sanitizeEmail(input.email);
  if (!email.includes("@")) return { error: "Invalid email." };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.bannedAt) {
      return { error: "This account has been suspended." };
    }
    await syncUserPlanEntitlements(existing.id);
    if (!existing.emailVerifiedAt) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: new Date() },
      });
      return toAuthUser(updated);
    }
    const fresh = await prisma.user.findUnique({ where: { id: existing.id } });
    return fresh ? toAuthUser(fresh) : toAuthUser(existing);
  }
  const baseHandle = sanitizeHandle(email.split("@")[0] || "viewer") || "viewer";
  let handle = baseHandle;
  let n = 0;
  while (await prisma.user.findUnique({ where: { handle } })) {
    n += 1;
    handle = `${baseHandle}${n}`;
  }
  const trial = newSignupTrialFields();
  const row = await prisma.user.create({
    data: {
      id: `u_${Math.random().toString(36).slice(2, 10)}`,
      email,
      name: sanitizeText(input.name || "", 80) || "Watcher",
      handle,
      passwordHash: null,
      ageVerified: true,
      plan: trial.plan,
      partyTrialEndsAt: trial.partyTrialEndsAt,
      freeHostsRemaining: trial.freeHostsRemaining,
      role: "user",
      emailVerifiedAt: new Date(),
      avatarHue: Math.floor(Math.random() * 360),
    },
  });
  return toAuthUser(row);
}

export async function verifyPassword(
  user: AuthUserRecord,
  password: string
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return compare(password, user.passwordHash);
}

export async function updateUserPlan(
  userId: string,
  plan: PlanId,
  stripe?: { customerId?: string; subscriptionId?: string | null }
): Promise<void> {
  const trialPatch =
    stripe?.subscriptionId
      ? { partyTrialEndsAt: null as Date | null } // paid sub replaces trial
      : plan === "free"
        ? { partyTrialEndsAt: new Date() } // end complimentary trial so sync won't re-upgrade
        : plan === "party"
          ? { partyTrialEndsAt: null as Date | null } // local/comp Party (testers / dev grant)
          : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      ...(stripe?.customerId !== undefined
        ? { stripeCustomerId: stripe.customerId }
        : {}),
      ...(stripe?.subscriptionId !== undefined
        ? { stripeSubscriptionId: stripe.subscriptionId }
        : {}),
      ...trialPatch,
    },
  });
}

export async function setStripeCustomer(
  userId: string,
  customerId: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

export function publicUser(user: AuthUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    plan: user.plan,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    partyTrialEndsAt: user.partyTrialEndsAt,
    freeHostsRemaining: user.freeHostsRemaining,
  };
}

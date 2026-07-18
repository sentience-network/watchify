import { hash, compare } from "bcryptjs";
import { prisma } from "../db";
import type { PlanId } from "../plans";
import { sanitizeEmail, sanitizeHandle, sanitizeText } from "../sanitize";
import type { UserRole } from "../roles";

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
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserByEmail(
  email: string
): Promise<AuthUserRecord | null> {
  const key = sanitizeEmail(email);
  const row = await prisma.user.findUnique({ where: { email: key } });
  return row ? toAuthUser(row) : null;
}

export async function findUserById(
  id: string
): Promise<AuthUserRecord | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toAuthUser(row) : null;
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
  const row = await prisma.user.create({
    data: {
      id,
      email,
      name: sanitizeText(input.name, 80) || "Watcher",
      handle,
      passwordHash: await hash(input.password, 10),
      ageVerified: true,
      plan: "free",
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
    if (!existing.emailVerifiedAt) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: new Date() },
      });
      return toAuthUser(updated);
    }
    return toAuthUser(existing);
  }
  const baseHandle = sanitizeHandle(email.split("@")[0] || "viewer") || "viewer";
  let handle = baseHandle;
  let n = 0;
  while (await prisma.user.findUnique({ where: { handle } })) {
    n += 1;
    handle = `${baseHandle}${n}`;
  }
  const row = await prisma.user.create({
    data: {
      id: `u_${Math.random().toString(36).slice(2, 10)}`,
      email,
      name: sanitizeText(input.name || "", 80) || "Watcher",
      handle,
      passwordHash: null,
      ageVerified: true,
      plan: "free",
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
  };
}

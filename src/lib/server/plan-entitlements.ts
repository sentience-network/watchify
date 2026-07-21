import { prisma } from "../db";
import type { PlanId } from "../plans";

type PlanFields = {
  id: string;
  plan: string;
  partyTrialEndsAt: Date | null;
  freeHostsRemaining: number;
  stripeSubscriptionId: string | null;
};

/**
 * Keep plan in sync with complimentary Party trial.
 * - Active trial → plan must be "party"
 * - Expired trial + no Stripe sub → plan → "free" (does not touch seeded comps with null trial)
 * - Stripe subscription → leave plan alone (webhooks own it)
 *
 * Call on auth/me/hydrate reads so expiry does not depend on cron.
 */
export async function syncUserPlanEntitlements(
  userId: string
): Promise<PlanFields | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      plan: true,
      partyTrialEndsAt: true,
      freeHostsRemaining: true,
      stripeSubscriptionId: true,
    },
  });
  if (!row) return null;

  // Paid billing wins — never auto-downgrade or override from trial.
  if (row.stripeSubscriptionId) {
    return row;
  }

  const now = new Date();
  const trialEnd = row.partyTrialEndsAt;

  if (trialEnd && trialEnd.getTime() > now.getTime()) {
    if (row.plan !== "party") {
      return prisma.user.update({
        where: { id: userId },
        data: { plan: "party" },
        select: {
          id: true,
          plan: true,
          partyTrialEndsAt: true,
          freeHostsRemaining: true,
          stripeSubscriptionId: true,
        },
      });
    }
    return row;
  }

  // Trial ended (date in the past) — revert complimentary Party → Free.
  // Seeded testers / comps have partyTrialEndsAt = null and are left alone.
  if (trialEnd && trialEnd.getTime() <= now.getTime() && row.plan === "party") {
    return prisma.user.update({
      where: { id: userId },
      data: {
        plan: "free",
        // Keep at least one free host credit after trial (default is already 1).
        freeHostsRemaining: Math.max(row.freeHostsRemaining, 1),
      },
      select: {
        id: true,
        plan: true,
        partyTrialEndsAt: true,
        freeHostsRemaining: true,
        stripeSubscriptionId: true,
      },
    });
  }

  return row;
}

export function effectiveCanHostParties(input: {
  plan: PlanId | string;
  freeHostsRemaining: number;
}): boolean {
  if (input.plan === "party") return true;
  return input.freeHostsRemaining > 0;
}

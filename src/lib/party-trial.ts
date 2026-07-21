/** Complimentary Party plan trial length for new signups. */
export const PARTY_TRIAL_DAYS = 30;

export function partyTrialEndsAtFromNow(days = PARTY_TRIAL_DAYS): Date {
  return new Date(Date.now() + days * 86_400_000);
}

/** Whole days remaining (ceil). Null if no active trial. */
export function partyTrialDaysLeft(
  endsAt: string | Date | null | undefined
): number | null {
  if (!endsAt) return null;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = end.getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export function formatPartyTrialLabel(
  endsAt: string | Date | null | undefined
): string | null {
  const days = partyTrialDaysLeft(endsAt);
  if (days == null) return null;
  if (days === 1) return "Party trial · 1 day left";
  return `Party trial · ${days} days left`;
}

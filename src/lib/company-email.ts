/**
 * Watchify company email addresses.
 *
 * Product domain is watchify.app (seed users, calendars, contact, VAPID).
 * Override via env for staging or before DNS is fully cut over.
 *
 * Setup guide: docs/COMPANY_EMAIL.md
 */

export const WATCHIFY_EMAIL_DOMAIN = "watchify.app";

const DEFAULT_FOUNDER = `dorian@${WATCHIFY_EMAIL_DOMAIN}`;
const DEFAULT_NICOLE = `nicole@${WATCHIFY_EMAIL_DOMAIN}`;
const DEFAULT_FROM = `Watchify <hello@${WATCHIFY_EMAIL_DOMAIN}>`;

/** Canonical founder address (primary contact / support / admin). */
export const DORIAN_EMAIL = DEFAULT_FOUNDER;

/** Additional team address. */
export const NICOLE_EMAIL = DEFAULT_NICOLE;

export type TeamMember = {
  name: string;
  email: string;
  /** Optional short role label — no bios. */
  role?: string;
};

/** Soft-launch team roster (addresses only). */
export const TEAM_ROSTER: readonly TeamMember[] = [
  { name: "Dorian", email: DEFAULT_FOUNDER, role: "Founder" },
  { name: "Nicole", email: DEFAULT_NICOLE },
];

/** Founder / admin inbox (reports, soft-launch bugs, account issues). */
export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    DEFAULT_FOUNDER
  );
}

/** Public contact / support address shown on /contact and footer. */
export function getContactEmail(): string {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    DEFAULT_FOUNDER
  );
}

/** Alias for support copy; same resolution as contact. */
export function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    DEFAULT_FOUNDER
  );
}

/** Additional team inbox (Nicole); does not replace primary contact. */
export function getNicoleEmail(): string {
  return process.env.NICOLE_EMAIL?.trim() || DEFAULT_NICOLE;
}

/**
 * Default transactional From header when EMAIL_FROM / RESEND_FROM unset.
 * Prefer hello@ for brand sends; Resend requires a verified domain first.
 */
export function getDefaultEmailFrom(): string {
  return DEFAULT_FROM;
}

export function contactMailto(subject?: string): string {
  const addr = getContactEmail();
  if (!subject) return `mailto:${addr}`;
  return `mailto:${addr}?subject=${encodeURIComponent(subject)}`;
}

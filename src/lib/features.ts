/** Runtime feature switches — prefer env so local/prod behave honestly. */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Allow PATCH /api/me plan without Stripe (local soft-launch only). */
export function devBillingGrantsEnabled(): boolean {
  if (process.env.WATCHIFY_DEV_BILLING === "true") return true;
  if (process.env.WATCHIFY_DEV_BILLING === "false") return false;
  return !isProduction();
}

/** Prefill / show seeded demo credentials on sign-in. */
export function showDemoLogin(): boolean {
  if (isProduction()) return process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true";
  return process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false";
}

/** Seed fictional users/friends/parties. */
export function seedDemoUsersEnabled(): boolean {
  if (process.env.WATCHIFY_SEED_DEMO_USERS === "false") return false;
  return true;
}

/** Use public Open Relay TURN when dedicated TURN_* is unset (dev/NAT). */
export function openRelayTurnEnabled(): boolean {
  if (process.env.WATCHIFY_OPEN_RELAY_TURN === "false") return false;
  if (process.env.TURN_URL && process.env.TURN_USER && process.env.TURN_PASS) {
    return false;
  }
  return process.env.WATCHIFY_OPEN_RELAY_TURN === "true" || !isProduction();
}

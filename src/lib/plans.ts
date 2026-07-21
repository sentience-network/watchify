export type PlanId = "free" | "plus" | "party";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  blurb: string;
  features: string[];
  highlighted?: boolean;
  /** Stripe Price ID env key name (not the secret itself) */
  stripePriceEnv: string | null;
  limits: {
    maxWatchlists: number | null;
    canHostParties: boolean;
    unlimitedFriends: boolean;
    socialLinks: boolean;
    priorityJoin: boolean;
    /** Max streaming services you can badge as subscriber. Viewing friends stays free. */
    maxLinkedServices: number | null;
  };
};

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Start a queue and share what you're watching.",
    stripePriceEnv: null,
    features: [
      "Up to 3 watchlists",
      "Link up to 2 streaming services",
      "Public watching + basic sharing",
      "Join unlimited watch parties",
      "1 free hosted party (lifetime)",
      "Friends feed & taste graph",
    ],
    limits: {
      maxWatchlists: 3,
      canHostParties: false,
      unlimitedFriends: false,
      socialLinks: false,
      priorityJoin: false,
      maxLinkedServices: 2,
    },
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 4.99,
    blurb: "Unlimited lists and connected social profiles.",
    stripePriceEnv: "STRIPE_PRICE_PLUS",
    highlighted: true,
    features: [
      "Unlimited watchlists",
      "Link all major streaming services",
      "Connect X, Instagram, TikTok, Letterboxd",
      "Compatible-friends matching",
      "Everything in Free",
    ],
    limits: {
      maxWatchlists: null,
      canHostParties: false,
      unlimitedFriends: true,
      socialLinks: true,
      priorityJoin: false,
      maxLinkedServices: null,
    },
  },
  {
    id: "party",
    name: "Party",
    priceMonthly: 9.99,
    blurb: "Host unlimited live rooms — the social HQ for movie night.",
    stripePriceEnv: "STRIPE_PRICE_PARTY",
    features: [
      "Host unlimited live watch parties",
      "Co-hosts, recurring rooms, invite links",
      "Face video rooms for up to 6 people",
      "Priority join request inbox",
      "Everything in Plus",
      "Best for people who gather friends weekly",
    ],
    limits: {
      maxWatchlists: null,
      canHostParties: true,
      unlimitedFriends: true,
      socialLinks: true,
      priorityJoin: true,
      maxLinkedServices: null,
    },
  },
];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planRank(id: PlanId): number {
  if (id === "party") return 2;
  if (id === "plus") return 1;
  return 0;
}

export function hasPlanAtLeast(current: PlanId, required: PlanId): boolean {
  return planRank(current) >= planRank(required);
}

/** Server: secret + publishable. Client: publishable only (secret is never bundled). */
export function stripeConfigured(): boolean {
  const publishable = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  if (typeof window !== "undefined") return publishable;
  return Boolean(process.env.STRIPE_SECRET_KEY && publishable);
}

export function getStripePriceId(planId: PlanId): string | null {
  const plan = getPlan(planId);
  if (!plan.stripePriceEnv) return null;
  return process.env[plan.stripePriceEnv] || null;
}

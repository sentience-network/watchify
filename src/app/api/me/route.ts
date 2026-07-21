import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/session";
import { findUserById, updateUserPlan } from "@/lib/server/users-db";
import {
  linkServiceDb,
  setSocialLinksDb,
  unlinkServiceDb,
  updateProfile,
} from "@/lib/server/social-db";
import type { PlanId } from "@/lib/plans";
import type { FavoritePerson, SocialLinks } from "@/lib/types";
import {
  isStreamingServiceId,
  type StreamingServiceId,
} from "@/lib/streaming";
import { EMPTY_SOCIAL_LINKS } from "@/lib/types";
import { devBillingGrantsEnabled } from "@/lib/features";
import { isStripeReady } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function linkedServicesFor(userId: string): Promise<StreamingServiceId[]> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { linkedServicesJson: true },
  });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.linkedServicesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is StreamingServiceId =>
        typeof id === "string" && isStreamingServiceId(id)
    );
  } catch {
    return [];
  }
}

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const user = await findUserById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const linkedServices = await linkedServicesFor(auth.userId);
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    plan: user.plan,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    partyTrialEndsAt: user.partyTrialEndsAt,
    freeHostsRemaining: user.freeHostsRemaining,
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    ageConfirmed: user.ageConfirmed,
    linkedServices,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  let body: {
    name?: string;
    bio?: string;
    socialLinks?: Partial<SocialLinks>;
    publicWatching?: boolean;
    ageConfirmed?: boolean;
    plan?: PlanId;
    linkService?: StreamingServiceId;
    unlinkService?: StreamingServiceId;
    avatarHue?: number;
    avatarUrl?: string | null;
    useDicebearAvatar?: boolean;
    profileTheme?: string;
    borderStyle?: string;
    accentColor?: string;
    accentPalette?: string;
    avatarStyle?: string;
    avatarFrame?: string;
    bannerStyle?: string;
    patternOverlay?: string;
    nameplateStyle?: string;
    profileBadgeIds?: string[];
    favoriteMovieIds?: string[];
    favoritePeople?: FavoritePerson[];
    partyAvailability?: unknown;
    friendCircles?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Plan writes: Stripe webhooks / Checkout session sync, or local dev grants.
  if (body.plan === "free" || body.plan === "plus" || body.plan === "party") {
    if (!isStripeReady() && !devBillingGrantsEnabled()) {
      return NextResponse.json(
        {
          error: "Billing not configured",
          message:
            "Set Stripe keys for live checkout, or WATCHIFY_DEV_BILLING=true for local plan grants.",
        },
        { status: 503 }
      );
    }
    await updateUserPlan(auth.userId, body.plan, {
      subscriptionId: body.plan === "free" ? null : undefined,
    });
  }

  if (body.linkService) {
    if (!isStreamingServiceId(body.linkService)) {
      return NextResponse.json(
        { error: "Unknown streaming service" },
        { status: 400 }
      );
    }
    const result = await linkServiceDb(auth.userId, body.linkService);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  if (body.unlinkService) {
    if (!isStreamingServiceId(body.unlinkService)) {
      return NextResponse.json(
        { error: "Unknown streaming service" },
        { status: 400 }
      );
    }
    await unlinkServiceDb(auth.userId, body.unlinkService);
  }

  if (
    body.name !== undefined ||
    body.bio !== undefined ||
    body.publicWatching !== undefined ||
    body.ageConfirmed !== undefined ||
    body.avatarHue !== undefined ||
    body.avatarUrl !== undefined ||
    body.useDicebearAvatar ||
    body.profileTheme !== undefined ||
    body.borderStyle !== undefined ||
    body.accentColor !== undefined ||
    body.accentPalette !== undefined ||
    body.avatarStyle !== undefined ||
    body.avatarFrame !== undefined ||
    body.bannerStyle !== undefined ||
    body.patternOverlay !== undefined ||
    body.nameplateStyle !== undefined ||
    body.profileBadgeIds !== undefined ||
    body.favoriteMovieIds !== undefined ||
    body.favoritePeople !== undefined ||
    body.partyAvailability !== undefined ||
    body.friendCircles !== undefined
  ) {
    await updateProfile(auth.userId, {
      name: body.name,
      bio: body.bio,
      publicWatching: body.publicWatching,
      ageConfirmed: body.ageConfirmed,
      avatarHue: body.avatarHue,
      avatarUrl: body.avatarUrl,
      useDicebearAvatar: body.useDicebearAvatar,
      profileTheme: body.profileTheme,
      borderStyle: body.borderStyle,
      accentColor: body.accentColor,
      accentPalette: body.accentPalette,
      avatarStyle: body.avatarStyle,
      avatarFrame: body.avatarFrame,
      bannerStyle: body.bannerStyle,
      patternOverlay: body.patternOverlay,
      nameplateStyle: body.nameplateStyle,
      profileBadgeIds: body.profileBadgeIds,
      favoriteMovieIds: body.favoriteMovieIds,
      favoritePeople: body.favoritePeople,
      partyAvailability: body.partyAvailability,
      friendCircles: body.friendCircles,
    });
  }

  if (body.socialLinks) {
    const result = await setSocialLinksDb(auth.userId, {
      ...EMPTY_SOCIAL_LINKS,
      ...body.socialLinks,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const [user, linkedServices] = await Promise.all([
    findUserById(auth.userId),
    linkedServicesFor(auth.userId),
  ]);
  return NextResponse.json({
    ok: true,
    plan: user?.plan,
    partyTrialEndsAt: user?.partyTrialEndsAt ?? null,
    freeHostsRemaining: user?.freeHostsRemaining ?? 0,
    linkedServices,
  });
}

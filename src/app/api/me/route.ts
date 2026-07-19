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
import type { SocialLinks } from "@/lib/types";
import type { StreamingServiceId } from "@/lib/streaming";
import { EMPTY_SOCIAL_LINKS } from "@/lib/types";
import { devBillingGrantsEnabled } from "@/lib/features";
import { isStripeReady } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;
  const user = await findUserById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    plan: user.plan,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    ageConfirmed: user.ageConfirmed,
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
    favoriteMovieIds?: string[];
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
    const result = await linkServiceDb(auth.userId, body.linkService);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  if (body.unlinkService) {
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
    body.favoriteMovieIds !== undefined
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
      favoriteMovieIds: body.favoriteMovieIds,
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

  const user = await findUserById(auth.userId);
  return NextResponse.json({ ok: true, plan: user?.plan });
}

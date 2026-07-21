import Link from "next/link";
import { getServerSession } from "next-auth";
import { HeroPosterSpiral } from "@/components/HeroPosterSpiral";
import { SiteFooter } from "@/components/SiteFooter";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadHeroPosters } from "@/lib/hero-posters";
import { funnelCounts } from "@/lib/server/analytics";
import { getPlan, type PlanId } from "@/lib/plans";
import { PRODUCT_TRUTH_COPY } from "@/lib/streaming";

async function loadPulse() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [counts, openParties, membersWeek] = await Promise.all([
      funnelCounts(weekAgo),
      prisma.party.count({ where: { status: "open" } }),
      prisma.partyMember.count({ where: { joinedAt: { gte: weekAgo } } }),
    ]);
    return {
      partyJoinsThisWeek: Math.max(counts.party_joined, membersWeek),
      openParties,
    };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [pulse, session, posters] = await Promise.all([
    loadPulse(),
    getServerSession(authOptions),
    loadHeroPosters(),
  ]);
  const signedIn = Boolean(session?.user?.id);
  const planId = (session?.user?.plan as PlanId | undefined) || "free";
  let freeHostsRemaining = 0;
  if (session?.user?.id) {
    try {
      const row = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { freeHostsRemaining: true },
      });
      freeHostsRemaining = row?.freeHostsRemaining ?? 0;
    } catch {
      freeHostsRemaining = 0;
    }
  }
  const canHost =
    signedIn &&
    (getPlan(planId).limits.canHostParties || freeHostsRemaining > 0);
  const joins = pulse?.partyJoinsThisWeek ?? 0;
  const open = pulse?.openParties ?? 0;
  const pulseLine =
    joins > 0
      ? `${joins.toLocaleString()} party join${joins === 1 ? "" : "s"} this week`
      : open > 0
        ? `${open} live room${open === 1 ? "" : "s"} open now`
        : "Be the first to host this week";

  return (
    <div className="film-grain min-h-screen">
      <header className="relative min-h-[100svh] overflow-hidden">
        <HeroPosterSpiral posters={posters} />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <p className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
              Watch<span className="text-teal">ify</span>
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className="hidden rounded-lg px-3 py-1.5 text-sm text-mist hover:text-white sm:inline"
              >
                Pricing
              </Link>
              {signedIn ? (
                <Link
                  href="/discover"
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-mist transition hover:border-teal/50 hover:text-teal-soft"
                >
                  Open app
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-mist transition hover:border-teal/50 hover:text-teal-soft"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-teal-soft"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="my-auto max-w-xl animate-fade-up pb-10 pt-14 md:pb-20 md:pt-20">
            <p className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
              Watch<span className="text-teal">ify</span>
            </p>
            <h1 className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight text-white/95 md:text-3xl">
              Watch together — on your streamers{" "}
              <span className="text-white/70">and</span> free on Watchify.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-mist md:text-lg">
              Sync parties with friends on Netflix, Max, or Disney+ via deep
              links (everyone uses their own login). Also stream Watchify Free
              public-domain titles and legal community uploads in-app — never
              licensed Netflix playback inside Watchify.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-teal-soft/90">
              Discord has voice. Watchify has playheads + taste + a free legal
              shelf.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <>
                  <Link
                    href="/discover"
                    className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-teal-soft animate-party-pulse"
                  >
                    See who&apos;s watching
                  </Link>
                  <Link
                    href="/parties"
                    className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber/40 hover:text-amber-soft"
                  >
                    Join a party
                  </Link>
                  {canHost ? (
                    <Link
                      href="/parties?create=1"
                      className="rounded-xl border border-teal/40 bg-teal/15 px-5 py-3 text-sm font-semibold text-teal-soft transition hover:bg-teal/25"
                    >
                      Start a party
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-mist transition hover:border-white/30 hover:text-white"
                    >
                      Host with Party plan
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    className="relative z-20 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-teal-soft animate-party-pulse"
                  >
                    Start free — 30 days Party
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="relative z-20 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-teal/50 hover:bg-white/15 hover:text-teal-soft"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-xs text-mist/55">
              {pulseLine} · Own-account sync · Free/legal in-app · No licensed
              Netflix in-app
            </p>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-mist/45">
              Soft launch tip: the free Render host may sleep — first load can
              take ~30–60s. If Sign in hangs, wait and retry.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-mist/75">
          {PRODUCT_TRUTH_COPY}
        </p>
        <div className="grid gap-10 md:grid-cols-3">
          {[
            {
              t: "Sync on your apps",
              d: "Own-account parties: deep links + playhead cues for Netflix, Max, Disney+, and more — each person uses their own legal login.",
            },
            {
              t: "Free & community on Watchify",
              d: "Public-domain / CC library with real in-app sync, plus legal community uploads after a safety check. Post your own rights-cleared video.",
            },
            {
              t: "Taste + parties",
              d: "Presence, face video for every joiner (hosting may need Party), and recommendations from friends — the social layer catalogs can't copy.",
            },
          ].map((card) => (
            <div key={card.t} className="animate-fade-up">
              <h2 className="font-display text-xl font-semibold text-white">
                {card.t}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mist/80">
                {card.d}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <SiteFooter />
        </div>
      </section>
    </div>
  );
}

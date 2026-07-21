import Link from "next/link";
import { getServerSession } from "next-auth";
import { HeroPosterSpiral } from "@/components/HeroPosterSpiral";
import { SiteFooter } from "@/components/SiteFooter";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadHeroPosters } from "@/lib/hero-posters";
import { funnelCounts } from "@/lib/server/analytics";
import { getPlan, type PlanId } from "@/lib/plans";

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
  const canHost = signedIn && getPlan(planId).limits.canHostParties;
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
              Watch together across every screen.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-mist md:text-lg">
              Presence, parties, and shared taste across Netflix, Max, Disney+,
              and Watchify Free — friends follow for free; each person keeps
              their own login.
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
                    className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-teal-soft animate-party-pulse"
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/discover"
                    className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber/40 hover:text-amber-soft"
                  >
                    See who&apos;s watching
                  </Link>
                  <Link
                    href="/parties"
                    className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-mist transition hover:border-white/30 hover:text-white"
                  >
                    Join a party
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="rounded-xl px-5 py-3 text-sm font-semibold text-mist/80 transition hover:text-white"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-xs text-mist/55">
              {pulseLine} · No password sharing · Legal sync only
            </p>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-mist/45">
              Soft launch tip: the free Render host may sleep — first load can
              take ~30–60s. If Sign in hangs, wait and retry.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            {
              t: "Presence",
              d: "See friends watching live — jump into chat without needing their streaming plan.",
            },
            {
              t: "Parties",
              d: "Own-account sync for paid apps. Real shared playback for Watchify Free titles.",
            },
            {
              t: "Taste graph",
              d: "Recommendations from what your friends finish — the moat catalogs can’t copy.",
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

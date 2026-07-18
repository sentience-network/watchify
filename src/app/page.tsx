import Image from "next/image";
import Link from "next/link";
import { CATALOG, backdropUrl, posterUrl } from "@/lib/movies";
import { SiteFooter } from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { funnelCounts } from "@/lib/server/analytics";

const hero = CATALOG[0];
const strip = CATALOG.slice(1, 8);

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
  const pulse = await loadPulse();
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
        <Image
          src={backdropUrl(hero)}
          alt=""
          fill
          priority
          className="object-cover scale-105 animate-fade-up"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/88 to-ink/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/55" />

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
              <Link
                href="/discover"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-mist transition hover:border-teal/50 hover:text-teal-soft"
              >
                Open app
              </Link>
            </div>
          </div>

          <div className="my-auto max-w-2xl animate-fade-up pb-8 pt-16 md:pb-16">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal">
              The social layer for everything you watch
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
              Watch together.
              <br />
              Across every screen.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-mist md:text-lg">
              Catalogs are commoditized. Watchify is the social graph for
              movie nights — presence, parties, and shared taste across Netflix,
              Max, Disney+, and Watchify Free. Friends follow for free; each
              person keeps their own login.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/parties"
                className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-teal-soft animate-party-pulse"
              >
                Start a party
              </Link>
              <Link
                href="/discover"
                className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber/40 hover:text-amber-soft"
              >
                See who&apos;s watching
              </Link>
            </div>
            <p className="mt-6 text-xs text-mist/55">
              {pulseLine} · No password sharing · Legal sync only
            </p>
          </div>

          <div className="relative mb-4 hidden h-28 overflow-hidden md:block">
            <div className="absolute bottom-0 flex gap-3 opacity-90">
              {strip.map((m, i) => (
                <div
                  key={m.id}
                  className="relative h-28 w-[76px] overflow-hidden rounded-md shadow-lg"
                  style={{
                    transform: `translateY(${(i % 3) * 6}px)`,
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <Image
                    src={posterUrl(m, "w342")}
                    alt={m.title}
                    fill
                    className="object-cover"
                    sizes="76px"
                  />
                </div>
              ))}
            </div>
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

import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Content & licensing",
  description:
    "How Watchify acquires catalog legally — public domain, trailers, AVOD, aggregators, studios — and what we never do.",
  path: "/content",
});

export default function ContentPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-white">
        Content & licensing
      </h1>
      <p className="mt-2 text-sm text-mist/70">
        How to get movies on Watchify — the legitimate ways only.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-mist">
        <section>
          <h2 className="font-display text-xl font-semibold text-white">
            Modes we support
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-white">Social share from your services</strong>{" "}
              — link Netflix/Disney+/etc. as badges; friends see title/poster/chat
              without needing that membership. No shared passwords or streams.
            </li>
            <li>
              <strong className="text-white">Own-account sync parties</strong> —
              Teleparty-style playhead hints + deep links; each person uses their
              own legal login.
            </li>
            <li>
              <strong className="text-white">Free on Watchify</strong> — trailers
              (YouTube embeds) and a public-domain / Creative Commons library with
              attribution, real in-app playback, and synced parties.
            </li>
            <li>
              <strong className="text-white">Deep links to your services</strong> —
              curated (~100+) catalog with official search/title URLs for Netflix,
              Max, Hulu, Prime, Disney+, Peacock, Paramount+, Apple TV+. Optional
              <code className="text-teal-soft">TMDB_API_KEY</code> for live
              watch/providers. Exact player timestamps via URL are usually not
              supported — parties show a live playhead + scrub helper instead.
            </li>
            <li>
              <strong className="text-white">Screen share of free/owned media</strong>{" "}
              — party video rooms fan out display capture to peers; paid streamer
              windows stay blocked.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-white">
            How we get catalog (roadmap)
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-white">Public domain & Creative Commons</strong>{" "}
              — Archive.org, Blender open movies, government works, CC-licensed
              shorts (what ships in the free library today).
            </li>
            <li>
              <strong className="text-white">Official trailers</strong> — YouTube
              / studio embeds for promotion; not full features.
            </li>
            <li>
              <strong className="text-white">AVOD partners</strong> — Tubi, Pluto,
              Plex, Freevee-style free ad-supported feeds via licensed partnerships.
            </li>
            <li>
              <strong className="text-white">Aggregators / distributors</strong> —
              Filmhub, Quiver, Magnolia, indie sales agents for licensed SVOD/TVOD
              windows.
            </li>
            <li>
              <strong className="text-white">Studio & streamer deals</strong> —
              negotiated rights packages (never scraping DRM apps).
            </li>
            <li>
              <strong className="text-white">Originals & UGC</strong> — Watchify
              originals plus creator uploads with DMCA notice-and-takedown.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-white">
            What we never do
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>No Netflix / Disney+ / etc. credential sharing or login proxies</li>
            <li>No DRM stream scraping or redistributing paid video to non-subscribers</li>
            <li>No “free Netflix” claims — social follow ≠ watching the film</li>
          </ul>
        </section>

        <p>
          Try the{" "}
          <Link href="/library" className="text-teal-soft hover:underline">
            free library
          </Link>
          , connect services in{" "}
          <Link href="/settings" className="text-teal-soft hover:underline">
            Settings
          </Link>
          , or host a party on{" "}
          <Link href="/parties" className="text-teal-soft hover:underline">
            Parties
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}

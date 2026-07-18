import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms for using Watchify social movie discovery and subscriptions.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-white">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-mist/70">Last updated: July 16, 2026</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-mist">
        <p>
          By creating an account or using Watchify, you agree to these Terms and
          our{" "}
          <Link href="/privacy" className="text-teal-soft hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/safety" className="text-teal-soft hover:underline">
            Community Guidelines
          </Link>
          .
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          The service
        </h2>
        <p>
          Watchify provides social movie discovery tools: watchlists, activity,
          watch parties, and sharing. Film metadata and images may come from
          third-party catalogs (e.g. TMDB CDN paths). Watchify does not stream
          movies and is not affiliated with studios or platforms you watch on.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Accounts & eligibility
        </h2>
        <p>
          You must be at least 13 years old. You are responsible for your
          credentials and for activity under your account. Do not impersonate
          others or create accounts for harassment.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Subscriptions & billing
        </h2>
        <p>
          Paid plans (Plus, Party) renew monthly via Stripe when configured.
          Prices are shown on the Pricing page. You can cancel through the Stripe
          customer portal; access continues through the paid period already
          charged. Demo mode may simulate plan features without charging — that
          is not a paid subscription.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Acceptable use
        </h2>
        <p>
          Do not harass, spam, scrape, reverse engineer, or use Watchify to
          facilitate illegal activity. We may suspend accounts that violate these
          Terms or our safety rules, including after valid reports.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Content
        </h2>
        <p>
          You retain rights to content you post (bios, list names, party names).
          You grant Watchify a license to host and display it to operate the
          service. Public content may appear in share previews.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Disclaimers
        </h2>
        <p>
          The service is provided “as is.” We do not guarantee uninterrupted
          uptime. To the fullest extent allowed by law, liability is limited to
          fees you paid us in the prior three months (or zero if on Free).
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Contact
        </h2>
        <p>
          Questions about these Terms:{" "}
          <Link href="/contact" className="text-teal-soft hover:underline">
            Contact page
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}

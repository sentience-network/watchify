import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Safety & Community Guidelines",
  description:
    "How Watchify keeps watch parties and social features safer for everyone.",
  path: "/safety",
});

export default function SafetyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-white">
        Safety & guidelines
      </h1>
      <p className="mt-2 text-sm text-mist/70">
        Watch parties should feel welcoming — not unsafe.
      </p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-mist">
        <h2 className="font-display text-xl font-semibold text-white">
          Be kind in queues and parties
        </h2>
        <p>
          No hate speech, threats, sexual content involving minors, doxxing, or
          targeted harassment. Party hosts should moderate join requests; decline
          anyone who makes members uncomfortable.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Age
        </h2>
        <p>
          Watchify is 13+. Do not invite younger users into parties. Report
          accounts that appear to violate the age rule.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Report & block
        </h2>
        <p>
          On any profile, use <strong className="text-white">Report</strong> or{" "}
          <strong className="text-white">Block</strong>. Blocking hides that
          person&apos;s activity, parties, and requests from your feeds. Reports
          are logged for review (API + local ops log).
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Sharing carefully
        </h2>
        <p>
          Public watching and public lists are visible to strangers. Use private
          lists and the “Hide” control on the now-watching bar when you want
          privacy. Only connect social profiles you are comfortable showing.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Streaming credentials
        </h2>
        <p>
          Never share Netflix, Disney+, or other streaming passwords with
          Watchify or friends. Linking a service only adds a social badge.
          Screen-sharing paid apps to redistribute video is blocked. See{" "}
          <Link href="/content" className="text-teal-soft hover:underline">
            Content &amp; licensing
          </Link>
          .
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Scams & spam
        </h2>
        <p>
          Watchify never asks for your password or Stripe credentials via DM.
          Treat unexpected payment links as suspicious.
        </p>
        <p>
          Need help?{" "}
          <Link href="/contact" className="text-teal-soft hover:underline">
            Contact us
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}

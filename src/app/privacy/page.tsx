import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How Watchify collects, uses, and shares data for social movie discovery.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-mist/70">Last updated: July 16, 2026</p>
      <div className="prose-watchify mt-8 space-y-5 text-sm leading-relaxed text-mist">
        <p>
          Watchify (“we”, “us”) helps people discover films, share watchlists, and
          host watch parties. This policy explains what we collect and why.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Data we collect
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Account data</strong> — email, display
            name, handle, password hash (we never store plaintext passwords).
          </li>
          <li>
            <strong className="text-white">Profile & social activity</strong> —
            watchlists, currently watching, parties, friend connections, optional
            public social profile links you connect.
          </li>
          <li>
            <strong className="text-white">Billing</strong> — when Stripe is
            enabled, payment details are processed by Stripe; we store customer
            and subscription IDs, not full card numbers.
          </li>
          <li>
            <strong className="text-white">Safety reports</strong> — reports you
            submit about other users, with a timestamp and reason.
          </li>
          <li>
            <strong className="text-white">Technical data</strong> — IP-based rate
            limiting, session cookies for sign-in, and local device storage for
            queues when you use the app without a backend database.
          </li>
        </ul>
        <h2 className="font-display text-xl font-semibold text-white">
          How we use data
        </h2>
        <p>
          To operate Watchify features (queues, parties, friends), authenticate
          you, process subscriptions, enforce community safety, and improve
          reliability. We do not sell personal information.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Sharing
        </h2>
        <p>
          Content you mark public (profiles, public lists, public watching, open
          parties) can be seen by other users and may be previewed via Open Graph
          when shared on social networks. Private watchlists stay private to your
          account session. Service providers such as Stripe (payments) and hosting
          platforms process data under their own terms.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Children
        </h2>
        <p>
          Watchify is for users <strong className="text-white">13 and older</strong>
          . We do not knowingly collect data from children under 13. If you believe
          a child created an account, contact us to delete it.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">
          Retention & rights
        </h2>
        <p>
          You may request access or deletion of account data by contacting us.
          Local browser storage can be cleared from your device. Subscription
          history may be retained as required for accounting and fraud prevention.
        </p>
        <h2 className="font-display text-xl font-semibold text-white">Cookies</h2>
        <p>
          Essential cookies keep you signed in. We ask for consent before treating
          non-essential storage as accepted. See also our cookie notice in the
          app.
        </p>
        <p>
          Questions:{" "}
          <Link href="/contact" className="text-teal-soft hover:underline">
            Contact
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}

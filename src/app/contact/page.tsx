import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "Contact Watchify for safety, privacy, and billing questions.",
  path: "/contact",
});

export default function ContactPage({
  searchParams,
}: {
  searchParams?: { topic?: string };
}) {
  const softLaunch = searchParams?.topic === "soft-launch";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <Link href="/" className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-white">
        {softLaunch ? "Soft-launch feedback" : "Contact"}
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-mist">
        {softLaunch ? (
          <>
            <p>
              Thanks for testing Watchify. Email{" "}
              <a
                href="mailto:hello@watchify.app?subject=Watchify%20soft-launch%20bug"
                className="text-teal-soft hover:underline"
              >
                hello@watchify.app
              </a>{" "}
              with subject <strong className="text-white">soft-launch bug</strong>.
            </p>
            <p>
              Please include: what you tried, device/browser, whether you were in
              a party, and the page URL. Screenshots help.
            </p>
            <p>
              Quick path to retest:{" "}
              <Link href="/library" className="text-teal-soft hover:underline">
                Free library
              </Link>
              {" · "}
              <Link href="/parties" className="text-teal-soft hover:underline">
                Parties
              </Link>
              {" · "}
              <Link href="/discover" className="text-teal-soft hover:underline">
                Discover
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p>
              For privacy requests, safety escalations, or billing questions,
              email{" "}
              <a
                href="mailto:hello@watchify.app"
                className="text-teal-soft hover:underline"
              >
                hello@watchify.app
              </a>
              .
            </p>
            <p>
              Include your account email, approximate timestamps, and any report
              IDs shown after submitting a report.
            </p>
            <p>
              In-product: use <strong className="text-white">Report</strong> on
              profiles, and manage blocks under{" "}
              <Link href="/settings" className="text-teal-soft hover:underline">
                Settings
              </Link>
              .
            </p>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

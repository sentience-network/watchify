"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useWatchify } from "@/lib/store";

const baseLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/library", label: "Free" },
  { href: "/parties", label: "Parties" },
  { href: "/feed", label: "Friends" },
  { href: "/messages", label: "Messages" },
  { href: "/tv", label: "TV mode" },
  { href: "/watchlists", label: "Lists" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { currentUserId } = useWatchify();
  const links = [
    ...baseLinks,
    ...(currentUserId
      ? [{ href: `/profile/${currentUserId}`, label: "Profile" }]
      : [{ href: "/auth/signin", label: "Profile" }]),
  ];

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-ink/80 px-4 py-6 md:flex">
        <Link href="/" className="mb-8 block">
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Watch<span className="text-teal">ify</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-teal/15 text-teal-soft"
                    : "text-mist hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/pricing"
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/pricing"
                ? "bg-teal/15 text-teal-soft"
                : "text-mist hover:bg-white/5 hover:text-white"
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/settings"
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/settings"
                ? "bg-teal/15 text-teal-soft"
                : "text-mist hover:bg-white/5 hover:text-white"
            }`}
          >
            Settings
          </Link>
          {(session?.user?.role === "admin" ||
            session?.user?.role === "mod") && (
            <>
              <Link
                href="/soft-launch"
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  pathname === "/soft-launch"
                    ? "bg-teal/15 text-teal-soft"
                    : "text-mist hover:bg-white/5 hover:text-white"
                }`}
              >
                Soft-launch script
              </Link>
              <Link
                href="/admin/analytics"
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith("/admin")
                    ? "bg-teal/15 text-teal-soft"
                    : "text-mist hover:bg-white/5 hover:text-white"
                }`}
              >
                Launch admin
              </Link>
            </>
          )}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-mist/60">
          {session?.user ? (
            <>
              <p className="text-mist">
                Signed in as{" "}
                <span className="text-white">{session.user.email}</span>
              </p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-teal-soft hover:underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/signin" className="text-teal-soft hover:underline">
              Sign in
            </Link>
          )}
          <p className="leading-relaxed">
            Social movie discovery — queues, watch parties, and friends.
          </p>
        </div>
      </aside>

      <nav className="fixed bottom-[72px] left-0 right-0 z-30 flex border-t border-line bg-ink/95 px-1 py-2 backdrop-blur md:hidden">
        {[
          { href: "/discover", label: "Discover" },
          { href: "/parties", label: "Parties" },
          { href: "/messages", label: "Messages" },
          { href: "/feed", label: "Friends" },
          { href: "/settings", label: "More" },
        ].map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 rounded-md py-2 text-center text-[11px] font-medium ${
                active ? "text-teal-soft" : "text-mist/80"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

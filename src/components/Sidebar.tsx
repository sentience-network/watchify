"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useWatchify } from "@/lib/store";

const baseLinks = [
  { href: "/discover", label: "Discover", badgeKey: null as string | null },
  { href: "/library", label: "Free", badgeKey: null },
  { href: "/upload", label: "Upload", badgeKey: null },
  { href: "/parties", label: "Parties", badgeKey: "joins" },
  { href: "/feed", label: "Friends", badgeKey: "friends" },
  { href: "/messages", label: "Messages", badgeKey: "dms" },
  { href: "/tv", label: "TV mode", badgeKey: null },
  { href: "/watchlists", label: "Lists", badgeKey: null },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-md bg-amber px-1 py-0.5 text-[10px] font-bold leading-none text-ink">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    currentUserId,
    unreadDmCount,
    myHostedJoinRequests,
    incomingFriendRequests,
  } = useWatchify();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const joinCount = myHostedJoinRequests.length;
  const friendCount = incomingFriendRequests.length;

  function badgeFor(key: string | null) {
    if (key === "dms") return unreadDmCount;
    if (key === "joins") return joinCount;
    if (key === "friends") return friendCount;
    return 0;
  }

  const links = [
    ...baseLinks,
    ...(currentUserId
      ? [{ href: `/profile/${currentUserId}`, label: "Profile", badgeKey: null }]
      : [{ href: "/auth/signin", label: "Profile", badgeKey: null }]),
  ];

  const mobileLinks = [
    { href: "/discover", label: "Discover", badgeKey: null as string | null },
    { href: "/library", label: "Free", badgeKey: null },
    { href: "/parties", label: "Parties", badgeKey: "joins" },
    { href: "/messages", label: "Messages", badgeKey: "dms" },
  ];

  const moreLinks = [
    { href: "/feed", label: "Friends", badgeKey: "friends" as string | null },
    ...(currentUserId
      ? [{ href: `/profile/${currentUserId}`, label: "Profile", badgeKey: null as string | null }]
      : [{ href: "/auth/signin", label: "Sign in", badgeKey: null as string | null }]),
    { href: "/watchlists", label: "Lists", badgeKey: null },
    { href: "/upload", label: "Upload", badgeKey: null },
    { href: "/tv", label: "TV mode", badgeKey: null },
    { href: "/settings", label: "Settings", badgeKey: null },
    { href: "/pricing", label: "Pricing", badgeKey: null },
  ];

  const moreActive = moreLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/")
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

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
            const count = badgeFor(link.badgeKey);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-teal/15 text-teal-soft"
                    : "text-mist hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{link.label}</span>
                <Badge count={count} />
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

      <nav
        className="fixed bottom-[var(--chrome-above-now)] left-0 right-0 z-30 flex min-h-[var(--mobile-tab-h)] border-t border-line bg-ink px-0.5 md:hidden"
        aria-label="Primary"
      >
        {mobileLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          const count = badgeFor(link.badgeKey);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex min-h-[var(--tap-min)] flex-1 flex-col items-center justify-center rounded-md px-0.5 text-center text-[11px] font-medium ${
                active ? "text-teal-soft" : "text-mist"
              }`}
            >
              <span className="relative inline-flex items-center">
                {link.label}
                {count > 0 ? (
                  <span className="absolute -right-3 -top-1.5 inline-flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-amber px-0.5 text-[9px] font-bold text-ink">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
        <div ref={moreRef} className="relative flex flex-1 flex-col items-center">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={`relative flex min-h-[var(--tap-min)] w-full flex-col items-center justify-center rounded-md px-0.5 text-center text-[11px] font-medium ${
              moreOpen || moreActive ? "text-teal-soft" : "text-mist"
            }`}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
          >
            <span className="relative inline-flex items-center">
              More
              {friendCount > 0 ? (
                <span className="absolute -right-3 -top-1.5 inline-flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-amber px-0.5 text-[9px] font-bold text-ink">
                  {friendCount > 9 ? "9+" : friendCount}
                </span>
              ) : null}
            </span>
          </button>
          {moreOpen ? (
            <div
              role="menu"
              className="absolute bottom-[calc(100%+0.5rem)] right-1 z-40 w-44 overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
            >
              {moreLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(link.href + "/");
                const count = badgeFor(link.badgeKey);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                      active
                        ? "bg-teal/15 text-teal-soft"
                        : "text-mist hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    <Badge count={count} />
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </nav>
    </>
  );
}

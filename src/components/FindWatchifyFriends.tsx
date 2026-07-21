"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useWatchify } from "@/lib/store";
import { profileShareUrl, watchingShareUrl } from "@/lib/share";
import type { User } from "@/lib/types";

type SearchHit = User & {
  relation?: "friends" | "outgoing" | "incoming" | "none";
};

function parsePartyInvite(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const fromPath = u.pathname.match(/\/share\/party\/([^/?#]+)/);
    if (fromPath?.[1]) return decodeURIComponent(fromPath[1]);
    const invite =
      u.searchParams.get("invite") || u.searchParams.get("join");
    if (invite) return invite;
  } catch {
    /* bare code */
  }
  if (/^[a-zA-Z0-9_-]{4,64}$/.test(t)) return t;
  return null;
}

/**
 * Soft-launch findability: search @handle/name, copy profile, paste party invite.
 */
export function FindWatchifyFriends({
  compact,
  showBootstrap = true,
}: {
  compact?: boolean;
  showBootstrap?: boolean;
}) {
  const router = useRouter();
  const {
    currentUserId,
    sendFriendRequest,
    acceptFriendRequest,
    incomingFriendRequests,
    state,
  } = useWatchify();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitePaste, setInvitePaste] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"profile" | "watching" | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!currentUserId || q.length < 1) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void fetch(`/api/users?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setHits((data.users || []) as SearchHit[]);
        })
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, currentUserId]);

  async function copy(kind: "profile" | "watching") {
    if (!currentUserId) return;
    const url =
      kind === "profile"
        ? profileShareUrl(currentUserId)
        : watchingShareUrl(currentUserId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function joinFromPaste(e: React.FormEvent) {
    e.preventDefault();
    const code = parsePartyInvite(invitePaste);
    if (!code) {
      setInviteError("Paste a party invite link or code.");
      return;
    }
    setInviteError(null);
    router.push(`/parties?invite=${encodeURIComponent(code)}`);
  }

  if (!currentUserId) {
    return (
      <div className="rounded-2xl border border-line bg-panel/50 p-4">
        <p className="text-sm text-mist">
          <Link href="/auth/signin" className="text-teal-soft hover:underline">
            Sign in
          </Link>{" "}
          to search for friends by @handle.
        </p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-teal/20 bg-panel/60 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Find friends
          </h2>
          <p className="mt-0.5 text-xs text-mist/70">
            Search by @handle or name — they still need to accept (unless
            you&apos;re already friends).
          </p>
        </div>
        <Link
          href="/feed"
          className="text-xs text-teal-soft hover:underline"
        >
          Activity feed →
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search @handle or name…"
        className="mt-3 w-full rounded-xl border border-line bg-ink/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-mist/45 focus:border-teal/40 focus:ring-1 focus:ring-teal/30"
        autoComplete="off"
      />

      {query.trim() && (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {searching && (
            <li className="text-xs text-mist/70">Searching…</li>
          )}
          {!searching && !hits.length && (
            <li className="text-xs text-mist/70">
              No users matched. Try another handle, or share your profile link
              below.
            </li>
          )}
          {hits.map((u) => {
            const incoming = incomingFriendRequests.find(
              (r) => r.fromUserId === u.id
            );
            const relation =
              u.relation ||
              (state.friendIds.includes(u.id) ? "friends" : "none");
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/80 bg-ink/30 px-2.5 py-2"
              >
                <Link
                  href={`/profile/${u.id}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <ProfileAvatar
                    name={u.name}
                    hue={u.avatarHue}
                    avatarUrl={u.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {u.name}
                    </span>
                    <span className="block truncate text-[11px] text-mist/65">
                      @{u.handle}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 gap-1.5">
                  {relation === "friends" ? (
                    <span className="rounded-lg bg-teal/15 px-2.5 py-1 text-[11px] font-medium text-teal-soft">
                      Friends
                    </span>
                  ) : incoming ? (
                    <button
                      type="button"
                      onClick={() => acceptFriendRequest(incoming.id)}
                      className="rounded-lg bg-teal px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-teal-soft"
                    >
                      Accept
                    </button>
                  ) : relation === "outgoing" ? (
                    <span className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-mist">
                      Requested
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendFriendRequest(u.id)}
                      className="rounded-lg bg-amber px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-amber-soft"
                    >
                      Add friend
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showBootstrap && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mist/55">
              Share so friends can find you
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy("profile")}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:border-teal/40 hover:text-white"
              >
                {copied === "profile" ? "Copied profile!" : "Copy profile link"}
              </button>
              <button
                type="button"
                onClick={() => void copy("watching")}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:border-teal/40 hover:text-white"
              >
                {copied === "watching"
                  ? "Copied!"
                  : "Share watching link"}
              </button>
              <Link
                href={`/profile/${currentUserId}`}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
              >
                Open my profile
              </Link>
            </div>
          </div>
          <form onSubmit={joinFromPaste} className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mist/55">
              Have a party invite?
            </p>
            <div className="flex gap-2">
              <input
                value={invitePaste}
                onChange={(e) => setInvitePaste(e.target.value)}
                placeholder="Paste invite link or code"
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink/40 px-3 py-1.5 text-xs text-white outline-none placeholder:text-mist/40 focus:border-teal/40"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal-soft hover:bg-teal/30"
              >
                Join
              </button>
            </div>
            {inviteError && (
              <p className="text-[11px] text-amber-soft">{inviteError}</p>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

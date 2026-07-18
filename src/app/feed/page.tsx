"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivityCard } from "@/components/ActivityCard";
import { WatchingNowStrip } from "@/components/WatchingNowStrip";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

export default function FeedPage() {
  const {
    feedActivities,
    ready,
    incomingFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    state,
    openParties,
  } = useWatchify();

  const friendPartyCount = openParties.filter(
    (p) =>
      state.friendIds.includes(p.hostId) || p.memberIds.some((id) => state.friendIds.includes(id))
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Friends
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Activity feed
          </h1>
          <p className="mt-2 text-sm text-mist/80">
            See public watching, friend activity, and open watch parties.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/parties"
              className="rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal-soft hover:bg-teal/25"
            >
              {openParties.length} open parties
              {friendPartyCount > 0 ? ` · ${friendPartyCount} from friends` : ""}
            </Link>
            <Link
              href={`/profile/${state.currentUserId}`}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
            >
              {state.friendIds.length} friends
            </Link>
          </div>
        </header>

        {!ready ? (
          <p className="text-mist">Loading feed…</p>
        ) : (
          <>
            <WatchingNowStrip />

            {incomingFriendRequests.length > 0 && (
              <section className="mb-8 rounded-2xl border border-teal/25 bg-panel/60 p-4 animate-fade-up">
                <h2 className="font-display text-lg font-semibold text-white">
                  Friend requests
                </h2>
                <ul className="mt-3 space-y-3">
                  {incomingFriendRequests.map((req) => {
                    const from = getUser(req.fromUserId);
                    if (!from) return null;
                    return (
                      <li
                        key={req.id}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-ink"
                            style={{
                              background: `hsl(${from.avatarHue} 70% 55%)`,
                            }}
                          >
                            {from.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <Link
                              href={`/profile/${from.id}`}
                              className="text-sm font-semibold text-white hover:text-teal-soft"
                            >
                              {from.name}
                            </Link>
                            <p className="text-xs text-mist/70">
                              @{from.handle} wants to be friends
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => acceptFriendRequest(req.id)}
                            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineFriendRequest(req.id)}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="space-y-3">
              {feedActivities.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
              {!feedActivities.length && (
                <p className="text-mist">
                  No friend activity yet — accept a request or start watching.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

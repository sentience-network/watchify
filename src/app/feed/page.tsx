"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivityCard } from "@/components/ActivityCard";
import { FindWatchifyFriends } from "@/components/FindWatchifyFriends";
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
    currentUserId,
  } = useWatchify();

  const friendPartyCount = openParties.filter(
    (p) =>
      state.friendIds.includes(p.hostId) ||
      p.memberIds.some((id) => state.friendIds.includes(id))
  ).length;
  const emptyGraph =
    ready &&
    !feedActivities.length &&
    state.friendIds.length === 0 &&
    incomingFriendRequests.length === 0;

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
              href={
                currentUserId ? `/profile/${currentUserId}` : "/auth/signin"
              }
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
            <div className="mb-6">
              <FindWatchifyFriends />
            </div>

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
              {emptyGraph && (
                <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-5">
                  <h2 className="font-display text-xl font-semibold text-white">
                    Your feed is empty — that&apos;s normal at soft launch
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist/80">
                    Search for a friend&apos;s @handle above, share your profile
                    link, or paste a party invite. Friend requests still need an
                    accept (except pre-linked tester accounts).
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-mist/85">
                    <li>
                      · Try{" "}
                      <code className="text-teal-soft">@tester01</code> …{" "}
                      <code className="text-teal-soft">@tester20</code> if
                      you&apos;re in the Party tester cohort
                    </li>
                    <li>
                      ·{" "}
                      <Link
                        href="/parties"
                        className="text-teal-soft hover:underline"
                      >
                        Join an open party
                      </Link>{" "}
                      or invite friends once you host
                    </li>
                    <li>
                      ·{" "}
                      <Link
                        href="/discover"
                        className="text-teal-soft hover:underline"
                      >
                        See who&apos;s watching
                      </Link>{" "}
                      on Discover
                    </li>
                  </ul>
                </div>
              )}
              {!emptyGraph && !feedActivities.length && (
                <p className="text-mist">
                  No friend activity yet — start watching or host a party so
                  friends see you here.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ActivityCard } from "@/components/ActivityCard";
import { FeedComposer } from "@/components/FeedComposer";
import { FindWatchifyFriends } from "@/components/FindWatchifyFriends";
import { WatchingNowStrip } from "@/components/WatchingNowStrip";
import { useWatchify } from "@/lib/store";
import { resolveDirectoryUser } from "@/lib/users";
import type { Activity } from "@/lib/types";

type FeedTab = "following" | "discover" | "nearby";

export default function FeedPage() {
  const {
    ready,
    incomingFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    state,
    openParties,
    currentUserId,
    directoryUsers,
    refreshFromServer,
  } = useWatchify();

  const [tab, setTab] = useState<FeedTab>("following");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const friendPartyCount = openParties.filter(
    (p) =>
      state.friendIds.includes(p.hostId) ||
      p.memberIds.some((id) => state.friendIds.includes(id))
  ).length;

  const loadFeed = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!currentUserId || tab === "nearby") {
        setActivities([]);
        setLoading(false);
        return;
      }
      if (!opts?.soft) setLoading(true);
      try {
        const res = await fetch(`/api/feed?tab=${tab}&take=60`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setActivities([]);
          return;
        }
        const data = (await res.json()) as { activities: Activity[] };
        const next = data.activities || [];
        if (!firstLoad.current && knownIds.current.size) {
          const arrived = next.filter((a) => !knownIds.current.has(a.id));
          if (arrived.length) {
            setNewIds(new Set(arrived.map((a) => a.id)));
            setLive(true);
            window.setTimeout(() => {
              setNewIds(new Set());
              setLive(false);
            }, 8000);
          }
        }
        knownIds.current = new Set(next.map((a) => a.id));
        firstLoad.current = false;
        setActivities(next);
      } catch {
        /* keep previous */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId, tab]
  );

  useEffect(() => {
    firstLoad.current = true;
    knownIds.current = new Set();
    setNewIds(new Set());
    setLive(false);
    void loadFeed();
  }, [loadFeed]);

  // Live poll while signed in on Following / Discover
  useEffect(() => {
    if (!currentUserId || tab === "nearby") return;
    const id = window.setInterval(() => void loadFeed({ soft: true }), 12_000);
    return () => window.clearInterval(id);
  }, [currentUserId, tab, loadFeed]);

  async function manualRefresh() {
    setRefreshing(true);
    await Promise.all([loadFeed({ soft: true }), refreshFromServer()]);
  }

  const emptyFollowing =
    ready &&
    tab === "following" &&
    !loading &&
    !activities.length &&
    state.friendIds.length === 0 &&
    incomingFriendRequests.length === 0;

  const tabs: { id: FeedTab; label: string; disabled?: boolean }[] = [
    { id: "following", label: "Following" },
    { id: "discover", label: "Discover" },
    { id: "nearby", label: "Nearby", disabled: true },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
                Live activity
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
                Feed
              </h1>
              <p className="mt-2 max-w-md text-sm text-mist/80">
                Watchify moments only — watching, finishes, parties, and short
                posts. Not a social network dump.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void manualRefresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:border-teal/35 hover:text-white"
            >
              {live ? (
                <span className="inline-flex items-center gap-1.5 text-teal-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal animate-live-glow" />
                  Live
                </span>
              ) : refreshing ? (
                "Refreshing…"
              ) : (
                "Refresh"
              )}
            </button>
          </div>
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

        <div
          role="tablist"
          aria-label="Feed filters"
          className="mb-6 flex flex-wrap gap-2 animate-slide-in"
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={t.disabled}
                title={
                  t.disabled
                    ? "Nearby is opt-in and coming later — location stays off"
                    : undefined
                }
                onClick={() => {
                  if (!t.disabled) setTab(t.id);
                }}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  active
                    ? "border-teal/40 bg-teal/15 text-teal-soft"
                    : t.disabled
                      ? "cursor-not-allowed border-line/60 text-mist/40"
                      : "border-line text-mist hover:border-teal/30 hover:text-white"
                }`}
              >
                {t.label}
                {t.disabled ? " (soon)" : ""}
              </button>
            );
          })}
        </div>

        {!ready || !currentUserId ? (
          <p className="text-mist">
            {!currentUserId ? (
              <>
                <Link href="/auth/signin" className="text-teal-soft hover:underline">
                  Sign in
                </Link>{" "}
                to see your live feed.
              </>
            ) : (
              "Loading feed…"
            )}
          </p>
        ) : tab === "nearby" ? (
          <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-5 animate-fade-up">
            <h2 className="font-display text-xl font-semibold text-white">
              Nearby — coming soon
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist/80">
              Opt-in local discovery (who&apos;s watching nearby) will arrive
              later. We will never turn on location without an explicit privacy
              consent — geo stays off for now.
            </p>
          </div>
        ) : (
          <>
            <FeedComposer onPosted={() => void loadFeed({ soft: true })} />

            {tab === "following" && (
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
                        const from = resolveDirectoryUser(
                          req.fromUserId,
                          directoryUsers
                        );
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
              </>
            )}

            {tab === "discover" && (
              <p className="mb-4 text-xs text-mist/65 animate-fade-up">
                Public watching, open parties, and Discover posts — private
                watching stays out of this tab.
              </p>
            )}

            <div className="space-y-3">
              {loading && !activities.length ? (
                <p className="text-mist">Loading activity…</p>
              ) : (
                activities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    isNew={newIds.has(a.id)}
                  />
                ))
              )}

              {emptyFollowing && (
                <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-5">
                  <h2 className="font-display text-xl font-semibold text-white">
                    Your Following feed is empty
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist/80">
                    Search for a friend&apos;s @handle above, share your profile
                    link, or paste a party invite. Friend requests still need an
                    accept (except pre-linked tester accounts).
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-mist/85">
                    <li>
                      · Demo logins:{" "}
                      <code className="text-teal-soft">alex@watchify.app</code>,{" "}
                      <code className="text-teal-soft">jordan@watchify.app</code>{" "}
                      (password <code className="text-teal-soft">watchify-demo</code>)
                    </li>
                    <li>
                      ·{" "}
                      <button
                        type="button"
                        onClick={() => setTab("discover")}
                        className="text-teal-soft hover:underline"
                      >
                        Browse Discover
                      </button>{" "}
                      for public watching &amp; open parties
                    </li>
                  </ul>
                </div>
              )}

              {!emptyFollowing && !loading && !activities.length && (
                <p className="text-mist">
                  {tab === "discover"
                    ? "No public activity yet — start watching with public sharing on, host an open party, or post to Discover."
                    : "No friend activity yet — start watching or host a party so friends see you here."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MoviePoster } from "@/components/MoviePoster";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie } from "@/lib/movies";
import { profileShareUrl, watchingShareUrl } from "@/lib/share";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    state,
    currentUserId,
    directoryUsers,
    isFriend,
    sendFriendRequest,
    acceptFriendRequest,
    outgoingFriendRequests,
    incomingFriendRequests,
    openParties,
    blockUser,
    isBlocked,
  } = useWatchify();
  const user =
    directoryUsers.find((u) => u.id === params.id) || getUser(params.id);
  const [reportMsg, setReportMsg] = useState("");
  const [reporting, setReporting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  if (!user) {
    return (
      <AppShell>
        <p className="text-mist">Profile not found.</p>
      </AppShell>
    );
  }

  const isMe = user.id === currentUserId;
  const watchingId = isMe
    ? state.currentlyWatchingId
    : user.currentlyWatchingId;
  const recentlyIds = isMe
    ? state.recentlyWatchedIds
    : user.recentlyWatchedIds;
  const watching = watchingId ? getMovie(watchingId) : null;
  const showWatching = isMe
    ? Boolean(watching && state.watchingPublic)
    : Boolean(watching);
  const recent = recentlyIds
    .map((id) => getMovie(id))
    .filter(Boolean)
    .map((m) => m!);
  const publicLists = state.watchlists.filter(
    (w) => w.ownerId === user.id && (w.isPublic || isMe)
  );
  const url =
    typeof window !== "undefined"
      ? profileShareUrl(user.id)
      : `/profile/${user.id}`;
  const watchingUrl =
    typeof window !== "undefined"
      ? watchingShareUrl(user.id)
      : `/share/watching/${user.id}`;

  const alreadyFriend = !isMe && isFriend(user.id);
  const blocked = !isMe && isBlocked(user.id);
  const outgoing = outgoingFriendRequests.find((r) => r.toUserId === user.id);
  const incoming = incomingFriendRequests.find((r) => r.fromUserId === user.id);
  const theirParties = openParties.filter((p) => p.hostId === user.id);
  const friendUsers = (isMe ? state.friendIds : user.friendIds)
    .map((id) => getUser(id))
    .filter(Boolean)
    .map((u) => u!);
  const social = isMe ? state.socialLinks : user.socialLinks;
  const linkedServices = isMe
    ? state.linkedServices
    : user.linkedServices || [];
  const watchingService = isMe
    ? state.currentlyWatchingServiceId
    : user.currentlyWatchingServiceId;
  const progress = isMe
    ? state.watchingProgressPercent
    : user.watchingProgressPercent;
  const socialEntries = social
    ? (
        [
          ["X", social.x],
          ["Instagram", social.instagram],
          ["TikTok", social.tiktok],
          ["Letterboxd", social.letterboxd],
        ] as const
      ).filter(([, href]) => Boolean(href))
    : [];

  async function submitReport(reason: string) {
    setReporting(true);
    setReportMsg("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: user!.id,
          reason,
          details: `Reported from profile ${user!.handle}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportMsg(data.error || "Report failed");
      } else {
        setReportMsg(`Report submitted (${data.id}). Thanks for helping keep Watchify safer.`);
      }
    } catch {
      setReportMsg("Could not submit report.");
    }
    setReporting(false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-ink"
              style={{ background: `hsl(${user.avatarHue} 70% 55%)` }}
            >
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-teal">
                Watchify profile
              </p>
              <h1 className="font-display text-3xl font-bold text-white">
                {user.name}
              </h1>
              <p className="text-sm text-mist/70">@{user.handle}</p>
              <p className="mt-2 max-w-md text-sm text-mist">{user.bio}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isMe && (
              <>
                {blocked ? (
                  <span className="rounded-lg border border-line px-3 py-2 text-xs text-mist">
                    Blocked
                  </span>
                ) : alreadyFriend ? (
                  <>
                    <span className="rounded-lg bg-teal/15 px-3 py-2 text-xs font-medium text-teal-soft">
                      Friends
                    </span>
                    <button
                      type="button"
                      disabled={messaging}
                      onClick={async () => {
                        setMessaging(true);
                        try {
                          const res = await fetch("/api/messages", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ friendId: user.id }),
                          });
                          const data = await res.json();
                          if (res.ok && data.conversationId) {
                            router.push(`/messages?c=${data.conversationId}`);
                          } else {
                            setReportMsg(data.error || "Could not open chat");
                          }
                        } finally {
                          setMessaging(false);
                        }
                      }}
                      className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft disabled:opacity-50"
                    >
                      {messaging ? "Opening…" : "Message"}
                    </button>
                  </>
                ) : incoming ? (
                  <button
                    type="button"
                    onClick={() => acceptFriendRequest(incoming.id)}
                    className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
                  >
                    Accept friend request
                  </button>
                ) : outgoing ? (
                  <span className="rounded-lg border border-line px-3 py-2 text-xs text-mist">
                    Request sent
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendFriendRequest(user.id)}
                    className="rounded-lg bg-amber px-3 py-2 text-xs font-semibold text-ink hover:bg-amber-soft"
                  >
                    Add friend
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => blockUser(user.id)}
                  className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
                >
                  Block
                </button>
                <button
                  type="button"
                  disabled={reporting}
                  onClick={() => submitReport("harassment_or_spam")}
                  className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
                >
                  Report
                </button>
              </>
            )}
            <ShareMenu
              url={url}
              title={`${user.name} on Watchify`}
              text={`See what ${user.name} is watching on Watchify`}
            />
            {showWatching && watching && (
              <ShareMenu
                url={watchingUrl}
                title={`${user.name} is watching ${watching.title}`}
                text={`${user.name} is watching ${watching.title} on Watchify`}
              />
            )}
          </div>
        </div>

        {reportMsg && (
          <p className="mt-4 text-sm text-amber-soft">{reportMsg}</p>
        )}

        {socialEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {socialEntries.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1 text-mist hover:border-teal/40 hover:text-teal-soft"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {linkedServices.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-mist/60">
              Streaming identity
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {linkedServices.map((id) => (
                <ServiceBadge key={id} serviceId={id} size="md" />
              ))}
            </div>
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-white">
              Currently watching
            </h2>
            {isMe && (
              <span className="text-xs text-mist/70">
                {state.watchingPublic ? "Visible publicly" : "Hidden from strangers"}
              </span>
            )}
          </div>
          {showWatching && watching ? (
            <div className="mt-3 flex gap-4 rounded-2xl border border-line bg-panel/50 p-4">
              <MoviePoster movie={watching} size="sm" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold text-white">
                    {watching.title}
                  </p>
                  <ServiceBadge serviceId={watchingService} />
                  {typeof progress === "number" && (
                    <span className="text-xs text-mist/60">{progress}%</span>
                  )}
                </div>
                <p className="text-sm text-mist/70">
                  {watching.year} · {watching.genres.join(" · ")}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-mist">
                  {watching.overview}
                </p>
                <p className="mt-2 text-[11px] text-mist/55">
                  Friends can follow this socially for free — no streaming
                  membership required to see the share.
                </p>
                {!isMe && (
                  <Link
                    href="/parties"
                    className="mt-3 inline-block text-xs font-medium text-teal-soft hover:underline"
                  >
                    Start a party around this →
                  </Link>
                )}
              </div>
            </div>
          ) : isMe && watching && !state.watchingPublic ? (
            <p className="mt-2 text-sm text-mist">
              You&apos;re watching {watching.title}, but it&apos;s hidden from the
              public feed. Toggle visibility in the now-watching bar.
            </p>
          ) : (
            <p className="mt-2 text-sm text-mist">Not watching anything right now.</p>
          )}
        </section>

        {theirParties.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-white">
              Open parties
            </h2>
            <ul className="mt-3 space-y-2">
              {theirParties.map((p) => {
                const movie = getMovie(p.movieId);
                return (
                  <li key={p.id}>
                    <Link
                      href="/parties"
                      className="flex items-center justify-between rounded-xl border border-line bg-panel/40 px-4 py-3 hover:border-teal/30"
                    >
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="text-xs text-mist">
                        {movie?.title}
                        {p.isLive ? " · Live" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Friends · {friendUsers.length}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {friendUsers.map((f) => (
              <Link
                key={f.id}
                href={`/profile/${f.id}`}
                className="flex items-center gap-2 rounded-full border border-line bg-panel/40 py-1.5 pl-1.5 pr-3 hover:border-teal/30"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-ink"
                  style={{ background: `hsl(${f.avatarHue} 70% 55%)` }}
                >
                  {f.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <span className="text-xs text-white">{f.name}</span>
              </Link>
            ))}
            {!friendUsers.length && (
              <p className="text-sm text-mist">No friends yet — send a request.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            Recently watched
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {recent.map((m) => (
              <div key={m.id} className="w-24">
                <MoviePoster movie={m} size="sm" />
                <p className="mt-1 line-clamp-2 text-xs text-mist">{m.title}</p>
              </div>
            ))}
            {!recent.length && (
              <p className="text-sm text-mist">No recent finishes yet.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">
            {isMe ? "Watchlists" : "Public watchlists"}
          </h2>
          <ul className="mt-3 space-y-2">
            {publicLists.map((wl) => (
              <li key={wl.id}>
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-panel/40 px-4 py-3 hover:border-teal/30"
                >
                  <span className="font-medium text-white">{wl.name}</span>
                  <span className="text-xs text-mist">
                    {wl.movieIds.length} titles
                    {!wl.isPublic && isMe ? " · Private" : ""}
                  </span>
                </Link>
              </li>
            ))}
            {!publicLists.length && (
              <p className="text-sm text-mist">No public lists yet.</p>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

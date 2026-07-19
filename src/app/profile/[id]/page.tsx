"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { InviteFriendsInApp } from "@/components/InviteFriendsInApp";
import { MoviePoster } from "@/components/MoviePoster";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileCustomizePanel } from "@/components/ProfileCustomizePanel";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import { getMovie } from "@/lib/movies";
import { personPosterUrl } from "@/lib/people";
import {
  normalizeBorderStyle,
  normalizeProfileTheme,
  sanitizeHexColor,
} from "@/lib/profile-themes";
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
    refreshFromServer,
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
  const theme = normalizeProfileTheme(user.profileTheme);
  const border = normalizeBorderStyle(user.borderStyle);
  const accent = sanitizeHexColor(user.accentColor || "#2dd4bf");
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
  const favorites = (user.favoriteMovieIds || [])
    .map((id) => getMovie(id))
    .filter(Boolean)
    .map((m) => m!);
  const favoritePeople = user.favoritePeople || [];
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
  const myLiveParty = isMe
    ? openParties.find((p) => p.hostId === currentUserId)
    : undefined;
  const friendUsers = (isMe ? state.friendIds : user.friendIds)
    .map((id) => directoryUsers.find((u) => u.id === id) || getUser(id))
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
          ["Facebook", social.facebook || ""],
          ["Instagram", social.instagram || ""],
          ["TikTok", social.tiktok || ""],
          ["Letterboxd", social.letterboxd || ""],
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
        setReportMsg(
          `Report submitted (${data.id}). Thanks for helping keep Watchify safer.`
        );
      }
    } catch {
      setReportMsg("Could not submit report.");
    }
    setReporting(false);
  }

  return (
    <AppShell>
      <div
        className={`profile-page profile-theme-${theme} profile-border-${border} mx-auto max-w-3xl animate-fade-up`}
        style={{ "--profile-accent": accent } as CSSProperties}
      >
        <div className="profile-frame rounded-3xl p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <ProfileAvatar
                name={user.name}
                hue={user.avatarHue}
                avatarUrl={user.avatarUrl}
                size="xl"
                ringColor={accent}
              />
              <div>
                <p
                  className="text-xs uppercase tracking-[0.16em]"
                  style={{ color: accent }}
                >
                  Watchify profile
                </p>
                <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
                  {user.name}
                </h1>
                <p className="text-sm text-mist/70">@{user.handle}</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">
                  {user.bio || (isMe ? "Add a short bio in Customize." : "")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isMe && (
                <ProfileCustomizePanel
                  initial={{
                    name: user.name,
                    bio: user.bio,
                    avatarHue: user.avatarHue,
                    avatarUrl: user.avatarUrl,
                    profileTheme: user.profileTheme,
                    borderStyle: user.borderStyle,
                    accentColor: user.accentColor,
                    favoriteMovieIds: user.favoriteMovieIds,
                    favoritePeople: user.favoritePeople,
                  }}
                  onSaved={() => void refreshFromServer()}
                />
              )}
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
                  className="rounded-full border border-line px-3 py-1 text-mist transition hover:text-white"
                  style={{ borderColor: `${accent}55` }}
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
        </div>

        {favorites.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-white">
              Favorite movies
            </h2>
            <p className="mt-1 text-xs text-mist/65">
              Showcase shelf — pick up to 8 in Customize.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {favorites.map((m) => (
                <Link key={m.id} href={`/watch/${m.id}`} className="w-24 group">
                  <MoviePoster movie={m} size="sm" />
                  <p className="mt-1 line-clamp-2 text-xs text-mist group-hover:text-white">
                    {m.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {favoritePeople.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-white">
              Favorite actors & directors
            </h2>
            <p className="mt-1 text-xs text-mist/65">
              Powers Discover recommendations — add from Customize or a person page.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {favoritePeople.map((p) => (
                <Link
                  key={p.id}
                  href={`/people/${p.id}`}
                  className="group w-24 text-center"
                >
                  <div className="relative mx-auto aspect-square w-20 overflow-hidden rounded-full border border-line bg-panel">
                    <Image
                      src={personPosterUrl(p.profilePath)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-mist group-hover:text-white">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-mist/55">
                    {p.department === "Directing" ? "Director" : "Actor"}
                  </p>
                </Link>
              ))}
            </div>
            {isMe && (
              <p className="mt-3 text-xs text-mist/60">
                <Link href="/discover?people=" className="text-teal-soft hover:underline">
                  Browse people on Discover
                </Link>{" "}
                · see picks under “For you · from your favorites”.
              </p>
            )}
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-white">
              Currently watching
            </h2>
            {isMe && (
              <span className="text-xs text-mist/70">
                {state.watchingPublic
                  ? "Visible publicly"
                  : "Hidden from strangers"}
              </span>
            )}
          </div>
          {showWatching && watching ? (
            <div className="mt-3 flex gap-4 rounded-2xl border border-line bg-panel/50 p-4 transition hover:border-teal/30">
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
                {!isMe && (
                  <Link
                    href="/parties"
                    className="mt-3 inline-block text-xs font-medium text-teal-soft hover:underline"
                  >
                    Start a party around this →
                  </Link>
                )}
                {showWatching && (
                  <div className="mt-2">
                    <ShareMenu
                      url={watchingUrl}
                      title={`${user.name} is watching ${watching.title}`}
                      text={`${user.name} is watching ${watching.title} on Watchify`}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          ) : isMe && watching && !state.watchingPublic ? (
            <p className="mt-2 text-sm text-mist">
              You&apos;re watching {watching.title}, but it&apos;s hidden. Toggle
              in the now-watching bar.
            </p>
          ) : (
            <p className="mt-2 text-sm text-mist">
              Not watching anything right now.
            </p>
          )}
        </section>

        {theirParties.length > 0 && (
          <section className="mt-8">
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
                      className="flex items-center justify-between rounded-xl border border-line bg-panel/40 px-4 py-3 transition hover:border-teal/30"
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

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Friends · {friendUsers.length}
              </h2>
              <p className="mt-1 text-xs text-mist/65">
                {isMe
                  ? "Quick list for party invites"
                  : "People they watch with"}
              </p>
            </div>
            {isMe && (
              <Link
                href="/parties"
                className="text-xs font-medium text-teal-soft hover:underline"
              >
                Host a party →
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {friendUsers.map((f) => (
              <Link
                key={f.id}
                href={`/profile/${f.id}`}
                className="flex items-center gap-2 rounded-full border border-line bg-panel/40 py-1.5 pl-1.5 pr-3 transition hover:border-teal/40"
              >
                <ProfileAvatar
                  name={f.name}
                  hue={f.avatarHue}
                  avatarUrl={f.avatarUrl}
                  size="sm"
                />
                <span className="text-xs text-white">{f.name}</span>
              </Link>
            ))}
            {!friendUsers.length && (
              <p className="text-sm text-mist">
                No friends yet — send a request from someone&apos;s profile.
              </p>
            )}
          </div>
          {isMe && myLiveParty?.inviteCode && (
            <div className="mt-4 rounded-2xl border border-teal/30 bg-teal/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-teal-soft">
                Quick invite to your live party
              </p>
              <div className="mt-2">
                <InviteFriendsInApp
                  inviteUrl={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/share/party/${myLiveParty.inviteCode}`
                      : `/share/party/${myLiveParty.inviteCode}`
                  }
                  partyName={myLiveParty.name}
                  movieTitle={
                    getMovie(myLiveParty.movieId)?.title || "a movie"
                  }
                />
              </div>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-white">
            Recently watched
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {recent.map((m) => (
              <Link key={m.id} href={`/watch/${m.id}`} className="w-24">
                <MoviePoster movie={m} size="sm" />
                <p className="mt-1 line-clamp-2 text-xs text-mist">{m.title}</p>
              </Link>
            ))}
            {!recent.length && (
              <p className="text-sm text-mist">No recent finishes yet.</p>
            )}
          </div>
        </section>

        <section className="mt-8 mb-4">
          <h2 className="font-display text-xl font-semibold text-white">
            {isMe ? "Watchlists" : "Public watchlists"}
          </h2>
          <ul className="mt-3 space-y-2">
            {publicLists.map((wl) => (
              <li key={wl.id}>
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-panel/40 px-4 py-3 transition hover:border-teal/30"
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { FindWatchifyFriends } from "@/components/FindWatchifyFriends";
import { InviteFriendsInApp } from "@/components/InviteFriendsInApp";
import { MoviePoster } from "@/components/MoviePoster";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileCustomizePanel } from "@/components/ProfileCustomizePanel";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareMenu } from "@/components/ShareMenu";
import {
  estimateWatchPosition,
  formatPlayhead,
  formatRelativeStarted,
  formatWatchStartedAt,
  suggestedJoinPlayheadSec,
} from "@/lib/deep-links";
import { isFreePlayable } from "@/lib/free-content";
import { getMovie } from "@/lib/movies";
import { personPosterUrl } from "@/lib/people";
import {
  PROFILE_BADGES,
  bannerCss,
  normalizeAvatarFrame,
  normalizeBannerStyle,
  normalizeBorderStyle,
  normalizeNameplateStyle,
  normalizePatternOverlay,
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
    restartWatchingTracker,
  } = useWatchify();
  const user =
    directoryUsers.find((u) => u.id === params.id) || getUser(params.id);
  const [reportMsg, setReportMsg] = useState("");
  const [reporting, setReporting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [tick, setTick] = useState(0);

  const isMe = Boolean(user && user.id === currentUserId);
  const watchingId = user
    ? isMe
      ? state.currentlyWatchingId
      : user.currentlyWatchingId
    : null;
  const watching = watchingId ? getMovie(watchingId) : null;
  const showWatching = user
    ? isMe
      ? Boolean(watching && state.watchingPublic)
      : Boolean(watching)
    : false;
  const watchingStartedAt = user
    ? isMe
      ? state.watchingStartedAt
      : user.watchingStartedAt
    : null;
  const progress = user
    ? isMe
      ? state.watchingProgressPercent
      : user.watchingProgressPercent
    : null;
  const livePartyForTitle =
    user && watchingId
      ? openParties.find(
          (p) =>
            p.hostId === user.id &&
            p.movieId === watchingId &&
            p.status === "open"
        )
      : undefined;
  const partySync = livePartyForTitle
    ? state.partyPlaybackSync.find((s) => s.partyId === livePartyForTitle.id)
    : undefined;

  useEffect(() => {
    if (!showWatching || !watchingStartedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, [showWatching, watchingStartedAt]);

  const position = useMemo(() => {
    void tick;
    if (partySync?.watchStartedAt || (partySync && partySync.positionSec > 0)) {
      const cue = suggestedJoinPlayheadSec(
        partySync.watchStartedAt,
        partySync.positionSec || 0,
        Boolean(partySync.playing)
      );
      return {
        elapsedSec: cue,
        percent:
          typeof progress === "number"
            ? progress
            : watching?.runtime
              ? Math.min(99, Math.round((cue / (watching.runtime * 60)) * 100))
              : null,
        label: `~${formatPlayhead(cue)} in`,
      };
    }
    return estimateWatchPosition({
      watchingStartedAt,
      progressPercent: progress,
      runtimeMinutes: watching?.runtime,
    });
  }, [tick, partySync, progress, watching?.runtime, watchingStartedAt]);

  if (!user) {
    return (
      <AppShell>
        <p className="text-mist">Profile not found.</p>
      </AppShell>
    );
  }

  const theme = normalizeProfileTheme(user.profileTheme);
  const border = normalizeBorderStyle(user.borderStyle);
  const accent = sanitizeHexColor(user.accentColor || "#2dd4bf");
  const banner = normalizeBannerStyle(user.bannerStyle);
  const pattern = normalizePatternOverlay(user.patternOverlay);
  const nameplate = normalizeNameplateStyle(user.nameplateStyle);
  const avatarFrame = normalizeAvatarFrame(user.avatarFrame);
  const badgeIds = user.profileBadgeIds || [];
  const bannerBackground = bannerCss(banner);
  const recentlyIds = isMe
    ? state.recentlyWatchedIds
    : user.recentlyWatchedIds;
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
  const freeTitle = watching ? isFreePlayable(watching) : false;

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
          {banner !== "none" && (
            <div
              className="profile-banner"
              style={{ background: bannerBackground }}
              aria-hidden
            />
          )}
          {pattern !== "none" && (
            <div
              className={`profile-pattern profile-pattern-${pattern}`}
              aria-hidden
            />
          )}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <ProfileAvatar
                name={user.name}
                hue={user.avatarHue}
                avatarUrl={user.avatarUrl}
                size="xl"
                ringColor={accent}
                frame={avatarFrame}
              />
              <div>
                <p
                  className="text-xs uppercase tracking-[0.16em]"
                  style={{ color: accent }}
                >
                  Watchify profile
                </p>
                <h1
                  className={`font-display text-3xl font-bold text-white md:text-4xl profile-nameplate-${nameplate}`}
                >
                  {user.name}
                </h1>
                <p className="text-sm text-mist/70">@{user.handle}</p>
                {badgeIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {badgeIds.map((id) => {
                      const meta = PROFILE_BADGES.find((b) => b.id === id);
                      return (
                        <span key={id} className="profile-badge-chip">
                          {meta?.label || id}
                        </span>
                      );
                    })}
                  </div>
                )}
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
                    accentPalette: user.accentPalette,
                    avatarStyle: user.avatarStyle,
                    avatarFrame: user.avatarFrame,
                    bannerStyle: user.bannerStyle,
                    patternOverlay: user.patternOverlay,
                    nameplateStyle: user.nameplateStyle,
                    profileBadgeIds: user.profileBadgeIds,
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

          {isMe && (
            <div className="mt-5 rounded-2xl border border-teal/25 bg-teal/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-teal-soft">
                Invite friends to Watchify
              </p>
              <p className="mt-1 text-sm text-mist/85">
                Share this profile so people can add you. They search your
                @handle or open the link — friend requests still need accept.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setReportMsg("Profile link copied — send it to a friend.");
                    } catch {
                      setReportMsg("Could not copy — use Share instead.");
                    }
                  }}
                  className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
                >
                  Copy profile link
                </button>
                <Link
                  href="/feed"
                  className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
                >
                  Find people by @handle
                </Link>
                <ShareMenu
                  url={url}
                  title={`${user.name} on Watchify`}
                  text={`Add me on Watchify — @${user.handle}`}
                  compact
                />
              </div>
            </div>
          )}

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
                · see “New from who you follow” and “For you · from your favorites”
                on Discover.
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
            <div className="mt-3 flex gap-4 rounded-2xl border border-teal/25 bg-panel/50 p-4">
              <MoviePoster movie={watching} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold text-white">
                    {watching.title}
                  </p>
                  <ServiceBadge serviceId={watchingService} />
                  {freeTitle ? (
                    <span className="rounded-md bg-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-soft">
                      Free on Watchify
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-mist/70">
                  {watching.year} · {watching.genres.slice(0, 3).join(" · ")}
                </p>
                <div className="mt-2 rounded-lg border border-line/70 bg-ink/40 px-3 py-2 text-sm">
                  {watchingStartedAt ? (
                    <p className="text-white">
                      Started{" "}
                      <span className="font-semibold text-teal-soft">
                        {formatWatchStartedAt(watchingStartedAt)}
                      </span>
                      <span className="text-mist/60">
                        {" "}
                        ({formatRelativeStarted(watchingStartedAt)})
                      </span>
                    </p>
                  ) : (
                    <p className="text-mist/70">Start time not shared yet.</p>
                  )}
                  <p className="mt-0.5 text-mist">
                    Join cue:{" "}
                    <span className="font-semibold text-white">
                      {position.label}
                    </span>
                    {position.percent !== null ? (
                      <span className="text-mist/60">
                        {" "}
                        · ~{position.percent}%
                      </span>
                    ) : null}
                    {partySync?.playing ? (
                      <span className="text-teal-soft"> · live playhead</span>
                    ) : null}
                  </p>
                  {!freeTitle ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-mist/55">
                      Off-site title — scrub to this time on your own service.
                      Watchify does not stream Netflix, Max, etc.
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {freeTitle ? (
                    <Link
                      href={`/watch/${watching.id}${
                        livePartyForTitle
                          ? `?party=${encodeURIComponent(livePartyForTitle.id)}`
                          : ""
                      }`}
                      className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink hover:bg-teal-soft"
                    >
                      {livePartyForTitle ? "Open sync player" : "Watch free"}
                    </Link>
                  ) : null}
                  {livePartyForTitle ? (
                    <Link
                      href={`/parties?joined=${encodeURIComponent(livePartyForTitle.id)}`}
                      className="rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal-soft hover:bg-teal/10"
                    >
                      Join their party
                    </Link>
                  ) : (
                    <Link
                      href={`/parties?create=1&movieId=${encodeURIComponent(watching.id)}&syncMode=${
                        freeTitle ? "watchify_free" : "own_account"
                      }`}
                      className="rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal-soft hover:bg-teal/10"
                    >
                      {isMe ? "Start party" : "Start party with this"}
                    </Link>
                  )}
                  {isMe ? (
                    <button
                      type="button"
                      onClick={() => restartWatchingTracker()}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:text-white"
                    >
                      Restart start timer
                    </button>
                  ) : null}
                  <ShareMenu
                    url={watchingUrl}
                    title={`${user.name} is watching ${watching.title}`}
                    text={
                      watchingStartedAt
                        ? `${user.name} started ${watching.title} at ${formatWatchStartedAt(watchingStartedAt)} — join around ${position.label} on Watchify`
                        : `${user.name} is watching ${watching.title} on Watchify`
                    }
                    compact
                  />
                </div>
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
                href="/feed"
                className="text-xs font-medium text-teal-soft hover:underline"
              >
                Find friends →
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
            {!friendUsers.length && isMe && (
              <div className="w-full space-y-3">
                <p className="text-sm text-mist">
                  No friends yet — search by @handle, share your profile link,
                  or paste a party invite.
                </p>
                <FindWatchifyFriends compact />
              </div>
            )}
            {!friendUsers.length && !isMe && (
              <p className="text-sm text-mist">
                No friends listed yet.
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

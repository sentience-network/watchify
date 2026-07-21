"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ServiceBadge } from "@/components/ServiceBadge";
import { ShareFromServicePanel } from "@/components/ShareFromServicePanel";
import { getPlan } from "@/lib/plans";
import { validateSocialUrl } from "@/lib/share";
import {
  NO_CREDENTIAL_COPY,
  STREAMING_HONEST_COPY,
  STREAMING_SERVICES,
} from "@/lib/streaming";
import { useWatchify } from "@/lib/store";
import { getUser } from "@/lib/users";
import {
  loadNotifyPrefs,
  saveNotifyPrefs,
  type NotifyMode,
} from "@/lib/notify-prefs";
import {
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/browser-notify";
import { PartyAvailabilityPicker } from "@/components/PartyAvailabilityPicker";
import { FriendCirclesPanel } from "@/components/FriendCirclesPanel";
import { parsePartyAvailability } from "@/lib/party-availability";
import { parseFriendCircles } from "@/lib/friend-circles";

export default function SettingsPage() {
  const { data: session } = useSession();
  const {
    state,
    setWatchingPublic,
    setSocialLinks,
    unblockUser,
    linkStreamingService,
    unlinkStreamingService,
    linkedServiceLimit,
    refreshFromServer,
    directoryUsers,
    ready,
  } = useWatchify();
  const [stripeReady, setStripeReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [links, setLinks] = useState(state.socialLinks);
  const [trakt, setTrakt] = useState<{
    configured: boolean; connected: boolean;
    connection?: { lastSyncedAt: string | null; lastSyncError: string | null };
    imported?: { id: string; title: string; year: number | null; catalogId: string | null; watchedAt: string | null }[];
  } | null>(null);
  const [traktBusy, setTraktBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [notifyMode, setNotifyMode] = useState<NotifyMode>("all");
  const [browserPerm, setBrowserPerm] = useState<string>("unsupported");
  const plan = getPlan(state.plan);

  useEffect(() => {
    const prefs = loadNotifyPrefs();
    setNotifyMode(prefs.mode);
    setBrowserPerm(notificationPermission());
  }, []);

  function updateNotifyMode(mode: NotifyMode) {
    setNotifyMode(mode);
    saveNotifyPrefs({ mode, promptHandled: true });
  }

  async function enableBrowserAlerts() {
    const perm = await requestNotificationPermission();
    setBrowserPerm(perm);
    saveNotifyPrefs({ promptHandled: true });
    if (perm === "granted" && notifyMode === "muted") {
      updateNotifyMode("all");
    }
  }

  useEffect(() => {
    setLinks(state.socialLinks);
  }, [state.socialLinks]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setStripeReady(Boolean(d.stripeReady)))
      .catch(() => undefined);
  }, []);

  async function loadTrakt() {
    const res = await fetch("/api/trakt");
    if (res.ok) setTrakt(await res.json());
  }

  useEffect(() => {
    if (session?.user) void loadTrakt();
  }, [session?.user]);

  async function traktAction(action: "connect" | "sync" | "disconnect") {
    setTraktBusy(true);
    setMsg("");
    const res = await fetch("/api/trakt", {
      method: action === "disconnect" ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "disconnect" ? undefined : JSON.stringify({ action }),
    });
    const data = await res.json();
    setTraktBusy(false);
    if (!res.ok) return setMsg(data.error || "Trakt request failed");
    if (data.url) return (window.location.href = data.url);
    setMsg(action === "sync" ? `Trakt sync complete (${data.imported} history items received).` : "Trakt disconnected.");
    await loadTrakt();
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let dirty = false;
    if (params.get("billing") === "success") {
      // Legacy query — prefer /billing/success?session_id=… which re-fetches Stripe
      void refreshFromServer();
      setMsg(
        "Billing return detected — refreshing plan from your account (server is source of truth)."
      );
      dirty = true;
    }
    const traktStatus = params.get("trakt");
    if (traktStatus === "connected") {
      setMsg("Trakt connected — watched history imported.");
      if (session?.user) void loadTrakt();
      dirty = true;
    } else if (traktStatus === "error") {
      setMsg(params.get("reason") || "Trakt connection failed.");
      dirty = true;
    }
    if (dirty) window.history.replaceState({}, "", "/settings");
  }, [refreshFromServer, session?.user]);

  async function openPortal() {
    setMsg("");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Portal unavailable");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function saveSocial(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    for (const key of [
      "x",
      "facebook",
      "instagram",
      "tiktok",
      "letterboxd",
    ] as const) {
      const result = validateSocialUrl(key, links[key]);
      if (!result.ok) {
        setMsg(result.error);
        return;
      }
      links[key] = result.url;
    }
    const saved = await setSocialLinks(links);
    if (!saved.ok) {
      setMsg(saved.error);
      return;
    }
    setMsg("Social links saved.");
  }

  if (!ready) {
    return (
      <AppShell>
        <p className="text-mist">Loading settings…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal">
            Watchify Settings
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            Account & privacy
          </h1>
        </header>

        {msg && (
          <p className="mb-4 rounded-xl border border-line bg-panel/50 px-4 py-3 text-sm text-mist">
            {msg}
          </p>
        )}

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Account
          </h2>
          {session?.user ? (
            <div className="mt-3 space-y-2 text-sm text-mist">
              <p>
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
            </div>
          ) : (
            <p className="mt-3 text-sm text-mist">
              <Link href="/auth/signin" className="text-teal-soft hover:underline">
                Sign in
              </Link>{" "}
              to sync billing and report with your account. Local demo data still
              works without signing in.
            </p>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5" aria-labelledby="trakt-heading">
          <h2 id="trakt-heading" className="font-display text-lg font-semibold text-white">Trakt history</h2>
          <p className="mt-1 text-xs leading-relaxed text-mist/75">
            Optional OAuth import of recent Trakt history. Trakt does not provide reliable live playback presence, so manual “Share what I’m watching” remains the live-presence path.
          </p>
          {!session?.user ? (
            <p className="mt-3 text-sm text-mist"><Link href="/auth/signin" className="text-teal-soft">Sign in</Link> to connect Trakt.</p>
          ) : trakt === null ? (
            <p className="mt-3 text-sm text-mist" role="status">Checking Trakt configuration…</p>
          ) : !trakt.configured ? (
            <div className="mt-3 rounded-xl border border-amber/30 p-3 text-sm text-amber-soft">
              <p>
                Trakt is not configured on this server. Free developer OAuth apps:{" "}
                <a
                  href="https://trakt.tv/oauth/applications"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-amber/50 underline-offset-2 hover:text-white"
                >
                  trakt.tv/oauth/applications
                </a>
                . Set <code className="text-xs">TRAKT_CLIENT_ID</code>,{" "}
                <code className="text-xs">TRAKT_CLIENT_SECRET</code>, and matching{" "}
                <code className="text-xs">TRAKT_REDIRECT_URI</code> (plus{" "}
                <code className="text-xs">TOKEN_ENCRYPTION_SECRET</code>). No connection is simulated.
              </p>
              <p className="mt-2 text-xs text-mist/80">
                Trakt is free metadata / history sync only — not streaming — and API rate limits apply.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-mist">
                {trakt.connected ? "Connected" : "Not connected"}
                {trakt.connection?.lastSyncedAt ? ` · last synced ${new Date(trakt.connection.lastSyncedAt).toLocaleString()}` : ""}
              </p>
              {trakt.connection?.lastSyncError && <p className="mt-2 text-sm text-amber-soft" role="alert">Last error: {trakt.connection.lastSyncError}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {!trakt.connected ? (
                  <button disabled={traktBusy} onClick={() => traktAction("connect")} className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60">Connect Trakt</button>
                ) : (
                  <>
                    <button disabled={traktBusy} onClick={() => traktAction("sync")} className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60">Refresh history</button>
                    <button disabled={traktBusy} onClick={() => traktAction("disconnect")} className="rounded-lg border border-line px-3 py-2 text-xs text-mist disabled:opacity-60">Disconnect</button>
                  </>
                )}
              </div>
              {Boolean(trakt.imported?.length) && (
                <ul className="mt-4 space-y-1 text-xs text-mist">
                  {trakt.imported!.slice(0, 5).map((item) => (
                    <li key={item.id}>{item.title}{item.year ? ` (${item.year})` : ""}{item.catalogId ? " · matched" : " · external metadata"}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Subscription
          </h2>
          <p className="mt-2 text-sm text-mist">
            Current plan:{" "}
            <span className="font-semibold text-teal-soft">{plan.name}</span>
          </p>
          {state.stripeCustomerId && (
            <p className="mt-1 text-xs text-mist/60">
              Stripe customer: {state.stripeCustomerId}
              {state.stripeSubscriptionId
                ? ` · sub ${state.stripeSubscriptionId}`
                : ""}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
            >
              Change plan
            </Link>
            {stripeReady && (
              <button
                type="button"
                onClick={openPortal}
                className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
              >
                Manage billing (Stripe)
              </button>
            )}
          </div>
          {!stripeReady && (
            <p className="mt-3 text-xs text-amber-soft">
              Stripe Checkout not configured — local billing grants may still
              update your plan until you add STRIPE_* keys.
            </p>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Privacy
          </h2>
          <label className="mt-3 flex items-center gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={state.watchingPublic}
              onChange={(e) => setWatchingPublic(e.target.checked)}
            />
            Show what I&apos;m watching publicly
          </label>
        </section>

        <div className="mb-8">
          <PartyAvailabilityPicker
            value={parsePartyAvailability(
              directoryUsers.find((u) => u.id === session?.user?.id)
                ?.partyAvailability || { status: "solo" }
            )}
            onSave={async (next) => {
              await fetch("/api/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partyAvailability: next }),
              });
              await refreshFromServer();
            }}
          />
        </div>

        <div className="mb-8">
          <FriendCirclesPanel
            circles={parseFriendCircles(
              directoryUsers.find((u) => u.id === session?.user?.id)
                ?.friendCircles || []
            )}
            friendIds={state.friendIds}
            onSave={async (next) => {
              await fetch("/api/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendCircles: next }),
              });
              await refreshFromServer();
            }}
          />
        </div>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Notifications
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-mist/75">
            In-app toasts always respect this setting. Browser alerts are
            optional and never auto-prompted on sign-in.
          </p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Alert mode</legend>
            {(
              [
                ["all", "All social alerts"],
                ["invites", "Invites & party reminders only"],
                ["muted", "Muted"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm text-mist"
              >
                <input
                  type="radio"
                  name="notify-mode"
                  checked={notifyMode === value}
                  onChange={() => updateNotifyMode(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="mt-3 text-xs text-mist/60">
            Browser permission:{" "}
            <span className="text-mist">{browserPerm}</span>
          </p>
          {browserPerm === "default" || browserPerm === "denied" ? (
            <button
              type="button"
              onClick={() => void enableBrowserAlerts()}
              className="mt-2 rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-white"
            >
              {browserPerm === "denied"
                ? "Permission blocked in browser settings"
                : "Enable browser alerts"}
            </button>
          ) : null}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Linked streaming services
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-mist/80">
            Mark the platforms you subscribe to. Watchify saves them on your
            profile for Discover filters, friend matching, and watching badges —
            this is not a Netflix/Disney login. We never ask for streaming
            passwords.
          </p>
          {!session?.user ? (
            <p className="mt-4 text-sm text-mist">
              <Link href="/auth/signin?callbackUrl=/settings" className="text-teal-soft hover:underline">
                Sign in
              </Link>{" "}
              to save linked services to your Watchify account.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-mist/60">
                {linkedServiceLimit === null
                  ? "Your plan can link all services."
                  : `Free plan: ${state.linkedServices.length}/${linkedServiceLimit} services linked.`}{" "}
                Friends can always see your watching activity for free.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {STREAMING_SERVICES.map((s) => {
                  const linked = state.linkedServices.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={linkBusy === s.id}
                      onClick={async () => {
                        setMsg("");
                        setLinkBusy(s.id);
                        try {
                          if (linked) {
                            const result = await unlinkStreamingService(s.id);
                            if (!result.ok) {
                              setMsg(result.error);
                              return;
                            }
                            setMsg(`Removed ${s.name} from your linked services.`);
                            return;
                          }
                          const result = await linkStreamingService(s.id);
                          if (!result.ok) {
                            setMsg(result.error);
                            return;
                          }
                          setMsg(
                            `Linked ${s.name} to your Watchify profile. Discover will prefer titles on this service.`
                          );
                        } finally {
                          setLinkBusy(null);
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition disabled:opacity-60 ${
                        linked
                          ? "border-teal/40 bg-teal/10 text-white"
                          : "border-line bg-ink/40 text-mist hover:border-teal/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ServiceBadge serviceId={s.id} size="md" />
                        {s.name}
                      </span>
                      <span className="text-xs">
                        {linkBusy === s.id
                          ? "Saving…"
                          : linked
                            ? "Linked"
                            : "Link"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-mist/55">
                {NO_CREDENTIAL_COPY}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-mist/55">
                {STREAMING_HONEST_COPY}
              </p>
              <div className="mt-5">
                <ShareFromServicePanel compact />
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Connected social
          </h2>
          <p className="mt-1 text-xs text-mist/70">
            Plus/Party only. Paste HTTPS profile URLs (not passwords). Sharing a
            Watchify link to Facebook/Instagram uses the Share menu — Instagram
            cannot auto-post from the web.
          </p>
          {!plan.limits.socialLinks ? (
            <p className="mt-3 text-sm text-amber-soft">
              Social profile URLs require{" "}
              <Link href="/pricing" className="underline">
                Plus or Party
              </Link>
              . Streaming service badges above work on Free (up to{" "}
              {linkedServiceLimit ?? "all"}).
            </p>
          ) : (
            <form onSubmit={saveSocial} className="mt-4 space-y-2">
              {(
                [
                  ["x", "X / Twitter"],
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["tiktok", "TikTok"],
                  ["letterboxd", "Letterboxd"],
                ] as const
              ).map(([key, label]) => (
                <input
                  key={key}
                  value={links[key]}
                  onChange={(e) =>
                    setLinks((s) => ({ ...s, [key]: e.target.value }))
                  }
                  placeholder={`${label} https://…`}
                  className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
                />
              ))}
              <button
                type="submit"
                className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink hover:bg-teal-soft"
              >
                Save links
              </button>
            </form>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-panel/50 p-5">
          <h2 className="font-display text-lg font-semibold text-white">
            Blocked users
          </h2>
          {state.blockedUserIds.length === 0 ? (
            <p className="mt-2 text-sm text-mist">No blocked users.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.blockedUserIds.map((id) => {
                const u = directoryUsers.find((x) => x.id === id) || getUser(id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between text-sm text-mist"
                  >
                    <span>{u?.name || id}</span>
                    <button
                      type="button"
                      onClick={() => unblockUser(id)}
                      className="text-teal-soft hover:underline"
                    >
                      Unblock
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-mist/60">
          Legal:{" "}
          <Link href="/privacy" className="hover:text-teal-soft">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-teal-soft">
            Terms
          </Link>
          {" · "}
          <Link href="/safety" className="hover:text-teal-soft">
            Safety
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

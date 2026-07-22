"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics-client";
import { rememberGuestUid } from "@/components/GuestMergeBridge";

/**
 * Party share link → display name → signed guest session (chat / Ready / face video).
 */
export function GuestJoinForm({
  inviteCode,
  disabledReason,
}: {
  inviteCode: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  if (disabledReason) {
    return (
      <p className="mt-5 rounded-xl border border-amber/30 p-3 text-sm text-amber-soft">
        {disabledReason}
      </p>
    );
  }

  async function joinAsGuest() {
    setBusy(true);
    setError("");
    setWaking(false);
    const wakeTimer = window.setTimeout(() => setWaking(true), 2500);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 55_000);
      const res = await fetch("/api/auth/guest-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          invite: inviteCode,
          ageConfirmed: ageOk,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join as guest");
        return;
      }
      const signed = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (signed?.error) {
        setError("Guest session failed — retry once (server may be waking).");
        return;
      }
      track("guest_joined", { partyId: data.partyId, source: "share" });
      if (data.userId) rememberGuestUid(data.userId);
      try {
        sessionStorage.setItem("watchify_guest_convert", "1");
      } catch {
        /* ignore */
      }
      router.push(`/parties?joined=${encodeURIComponent(data.partyId)}&guest=1`);
    } catch {
      setError(
        "Server is waking up (free Render can take ~30–60s). Wait, then tap Retry — not a bad invite."
      );
      setAttempt((n) => n + 1);
    } finally {
      window.clearTimeout(wakeTimer);
      setBusy(false);
      setWaking(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-teal/30 bg-teal/5 p-4">
      <p className="text-sm font-medium text-white">Join as guest</p>
      <p className="text-xs leading-relaxed text-mist/75">
        Enter a display name — no full signup. You get chat, Ready board, and
        face video. We&apos;ll nudge you to save an account after.
      </p>
      <label className="block text-xs text-mist/70">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Sam"
          className="mt-1.5 w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-mist">
        <input
          type="checkbox"
          checked={ageOk}
          onChange={(e) => setAgeOk(e.target.checked)}
          className="mt-0.5"
        />
        I confirm I am 13 or older
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || name.trim().length < 2 || !ageOk}
          onClick={() => void joinAsGuest()}
          className="min-h-[var(--tap-min)] rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {busy
            ? waking
              ? "Waking server…"
              : "Joining…"
            : attempt
              ? "Retry guest join"
              : "Join with name"}
        </button>
        <Link
          href={`/auth/signup?callbackUrl=${encodeURIComponent(
            `/share/party/${inviteCode}`
          )}`}
          onClick={() =>
            localStorage.setItem("watchify_pending_invite", inviteCode)
          }
          className="inline-flex min-h-[var(--tap-min)] items-center rounded-xl border border-line px-4 py-3 text-sm text-mist hover:text-white"
        >
          Create account instead
        </Link>
      </div>
      {busy ? (
        <div className="space-y-2" aria-live="polite">
          <div className="h-2 animate-pulse rounded bg-mist/20" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-mist/15" />
          <p className="text-[11px] text-mist/70">
            {waking
              ? "Cold start — keep this tab open. First join after sleep can take under a minute."
              : "Connecting to the party…"}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

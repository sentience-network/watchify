"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics-client";
import { GuestJoinForm } from "@/components/GuestJoinForm";

export function InviteJoinButton({
  inviteCode,
  disabledReason,
}: {
  inviteCode: string;
  disabledReason?: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const autoJoined = useRef(false);
  const opened = useRef(false);
  const returnPath = `/share/party/${encodeURIComponent(inviteCode)}`;

  useEffect(() => {
    if (opened.current || status === "loading") return;
    opened.current = true;
    track("invite_opened", { authenticated: Boolean(session?.user) });
    try {
      const depth = Number(sessionStorage.getItem("watchify_invite_depth") || "0") + 1;
      sessionStorage.setItem("watchify_invite_depth", String(depth));
      track("invite_depth", { depth, source: "share_party" });
    } catch {
      /* ignore */
    }
  }, [status, session?.user]);

  useEffect(() => {
    if (!session?.user || autoJoined.current) return;
    if (localStorage.getItem("watchify_pending_invite") !== inviteCode) return;
    autoJoined.current = true;
    localStorage.removeItem("watchify_pending_invite");
    void join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, inviteCode]);

  async function join() {
    setBusy(true);
    setError("");
    setWaking(false);
    const wakeTimer = window.setTimeout(() => setWaking(true), 2500);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 55_000);
      const response = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join_invite", invite: inviteCode }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not join party");
        return;
      }
      track("party_joined", { partyId: data.party.id, source: "invite_ui" });
      const syncMode = data.party.syncMode as string | undefined;
      const movieId = data.party.movieId as string | undefined;
      if (syncMode === "watchify_free" && movieId) {
        router.push(
          `/watch/${encodeURIComponent(movieId)}?party=${encodeURIComponent(data.party.id)}&joined=1`
        );
        return;
      }
      router.push(`/parties?joined=${encodeURIComponent(data.party.id)}`);
    } catch {
      setError(
        "Server is waking up (free Render can take ~30–60s). Wait, then retry — not a bad invite."
      );
    } finally {
      window.clearTimeout(wakeTimer);
      setBusy(false);
      setWaking(false);
    }
  }

  if (disabledReason)
    return (
      <p className="mt-5 rounded-xl border border-amber/30 p-3 text-sm text-amber-soft">
        {disabledReason}
      </p>
    );
  if (status === "loading")
    return (
      <div className="mt-5 space-y-2" role="status">
        <div className="h-10 animate-pulse rounded-xl bg-mist/15" />
        <p className="text-sm text-mist">Checking your account…</p>
      </div>
    );
  if (!session?.user) {
    const callback = encodeURIComponent(returnPath);
    return (
      <div className="mt-5 space-y-4">
        <GuestJoinForm inviteCode={inviteCode} />
        <div className="rounded-xl border border-line/70 bg-ink/30 p-4">
          <p className="text-sm text-mist">
            Or create an account / sign in to keep friends and history.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              onClick={() =>
                localStorage.setItem("watchify_pending_invite", inviteCode)
              }
              href={`/auth/signup?callbackUrl=${callback}`}
              className="rounded-xl border border-teal/40 px-5 py-3 text-sm font-semibold text-teal-soft"
            >
              Create account & join
            </Link>
            <Link
              onClick={() =>
                localStorage.setItem("watchify_pending_invite", inviteCode)
              }
              href={`/auth/signin?callbackUrl=${callback}`}
              className="rounded-xl border border-line px-5 py-3 text-sm text-white"
            >
              Sign in & join
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => void join()}
        disabled={busy}
        className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? (waking ? "Waking server…" : "Joining…") : "Join party"}
      </button>
      {busy ? (
        <div className="mt-3 space-y-2" aria-live="polite">
          <div className="h-2 animate-pulse rounded bg-mist/20" />
          <p className="text-[11px] text-mist/70">
            First open after sleep can take under a minute — keep this tab open.
          </p>
        </div>
      ) : null}
      {error && (
        <p className="mt-3 text-sm text-amber-soft" role="alert">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void join()}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}

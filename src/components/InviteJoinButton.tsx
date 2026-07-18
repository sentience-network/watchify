"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics-client";

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
  const autoJoined = useRef(false);
  const opened = useRef(false);
  const returnPath = `/share/party/${encodeURIComponent(inviteCode)}`;

  useEffect(() => {
    if (opened.current || status === "loading") return;
    opened.current = true;
    track("invite_opened", { authenticated: Boolean(session?.user) });
  }, [status, session?.user]);

  useEffect(() => {
    if (!session?.user || autoJoined.current) return;
    if (localStorage.getItem("watchify_pending_invite") !== inviteCode) return;
    autoJoined.current = true;
    localStorage.removeItem("watchify_pending_invite");
    void join();
    // `join` intentionally runs only for the pending post-auth conversion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, inviteCode]);

  async function join() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_invite", invite: inviteCode }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Could not join party");
      return;
    }
    // Server already records party_joined — client event is for product analytics only once.
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
  }

  if (disabledReason)
    return (
      <p className="mt-5 rounded-xl border border-amber/30 p-3 text-sm text-amber-soft">
        {disabledReason}
      </p>
    );
  if (status === "loading")
    return (
      <p className="mt-5 text-sm text-mist" role="status">
        Checking your account…
      </p>
    );
  if (!session?.user) {
    const callback = encodeURIComponent(returnPath);
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm text-mist">
          Preview first — create an account or sign in to join the room.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            onClick={() =>
              localStorage.setItem("watchify_pending_invite", inviteCode)
            }
            href={`/auth/signup?callbackUrl=${callback}`}
            className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink"
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
    );
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Joining…" : "Join party"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-amber-soft" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

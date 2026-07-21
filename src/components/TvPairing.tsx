"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type PairState = {
  code: string;
  status: "waiting" | "paired";
  phoneUserId?: string;
  phoneName?: string;
  commands?: { id: string; type: string; payload?: Record<string, string> }[];
};

/**
 * Living-room TV shows a code; phone claims it and sends remote cues
 * (open party, reaction, scrub hint). MVP via SoftKv — not a native TV app.
 */
export function TvPairHost() {
  const [pair, setPair] = useState<PairState | null>(null);
  const [error, setError] = useState("");
  const [lastCmd, setLastCmd] = useState("");
  const seenCommandId = useRef<string | null>(null);
  const remoteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tv/remote`
      : "/tv/remote";

  const refresh = useCallback(async (code: string) => {
    const res = await fetch(`/api/tv/pair?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Pair expired");
      return;
    }
    setPair(data.pair);
    const cmds = (data.pair.commands || []) as PairState["commands"];
    if (cmds?.length) {
      const last = cmds[cmds.length - 1];
      if (last.id && last.id === seenCommandId.current) return;
      if (last.id) seenCommandId.current = last.id;
      setLastCmd(`${last.type}${last.payload?.partyId ? ` · ${last.payload.partyId}` : ""}`);
      if (last.type === "open_party" && last.payload?.partyId) {
        window.location.href = `/parties/${last.payload.partyId}`;
      }
    }
  }, []);

  async function create() {
    setError("");
    seenCommandId.current = null;
    const res = await fetch("/api/tv/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create code");
      return;
    }
    setPair(data.pair);
  }

  useEffect(() => {
    if (!pair?.code) return;
    const id = window.setInterval(() => void refresh(pair.code), 2000);
    return () => window.clearInterval(id);
  }, [pair?.code, refresh]);

  return (
    <section className="mb-10 rounded-2xl border border-teal/25 bg-panel/50 p-6 text-center">
      <h2 className="font-display text-2xl font-semibold text-white">
        Phone remote
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-mist/75">
        Pair your phone as a remote for this TV browser — open parties, drop
        reactions, and share scrub hints. Chat stays on the phone.
      </p>
      {!pair ? (
        <button
          type="button"
          onClick={() => void create()}
          className="mt-4 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink"
        >
          Show pair code
        </button>
      ) : (
        <div className="mt-4">
          <p className="font-display text-4xl font-bold tracking-[0.35em] text-teal-soft">
            {pair.code}
          </p>
          <p className="mt-2 text-xs text-mist/70">
            On your phone open{" "}
            <Link href="/tv/remote" className="text-teal-soft underline">
              {remoteUrl}
            </Link>{" "}
            and enter this code.
          </p>
          <p className="mt-2 text-sm text-white">
            {pair.status === "paired"
              ? `Paired with ${pair.phoneName || "phone"}`
              : "Waiting for phone…"}
          </p>
          {lastCmd ? (
            <p className="mt-1 text-xs text-mist/60">Last cue: {lastCmd}</p>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function TvRemoteClient() {
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [paired, setPaired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [partyId, setPartyId] = useState("");

  async function claim() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/tv/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim", code: code.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not pair");
      return;
    }
    setPaired(true);
  }

  async function send(type: string, payload?: Record<string, string>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/tv/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "command",
        code: code.trim(),
        type,
        payload,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error || "Failed");
  }

  if (!session?.user) {
    return (
      <p className="text-sm text-mist">
        <Link href="/auth/signin?callbackUrl=/tv/remote" className="text-teal-soft underline">
          Sign in
        </Link>{" "}
        to use the TV remote.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel/50 p-5">
      <h1 className="font-display text-2xl font-bold text-white">TV remote</h1>
      <p className="mt-1 text-xs text-mist/70">
        Enter the code on the living-room screen. This links your phone session
        to that TV browser — it does not sign into Netflix or other streamers.
      </p>
      {!paired ? (
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="flex-1 rounded-lg border border-line bg-ink/60 px-3 py-2 text-center font-display text-lg tracking-widest text-white"
          />
          <button
            type="button"
            disabled={busy || code.trim().length < 4}
            onClick={() => void claim()}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Pair
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-teal-soft">Paired · sending to TV</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send("reaction", { emoji: "👏" })}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              👏
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send("reaction", { emoji: "🔥" })}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              🔥
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send("scrub_hint")}
              className="rounded-lg border border-line px-3 py-2 text-xs text-mist"
            >
              Scrub hint
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              placeholder="Party id to open on TV"
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={busy || !partyId.trim()}
              onClick={() =>
                void send("open_party", { partyId: partyId.trim() })
              }
              className="rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
            >
              Open
            </button>
          </div>
          <Link href="/parties" className="block text-xs text-teal-soft underline">
            Browse parties →
          </Link>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-amber-soft" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

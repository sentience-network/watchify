"use client";

import { useMemo, useState } from "react";
import {
  newCircleId,
  type FriendCircle,
} from "@/lib/friend-circles";
import { getUser } from "@/lib/users";

export function FriendCirclesPanel({
  circles,
  friendIds,
  onSave,
}: {
  circles: FriendCircle[];
  friendIds: string[];
  onSave: (next: FriendCircle[]) => Promise<void> | void;
}) {
  const [local, setLocal] = useState(circles);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const friends = useMemo(
    () =>
      friendIds
        .map((id) => getUser(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof getUser>>[],
    [friendIds]
  );

  async function persist(next: FriendCircle[]) {
    setLocal(next);
    setBusy(true);
    setMsg("");
    await onSave(next);
    setBusy(false);
    setMsg("Circles saved.");
  }

  function addCircle() {
    const n = name.trim();
    if (!n) return;
    void persist([
      ...local,
      { id: newCircleId(), name: n, memberIds: [] },
    ]);
    setName("");
  }

  function toggleMember(circleId: string, userId: string) {
    const next = local.map((c) => {
      if (c.id !== circleId) return c;
      const has = c.memberIds.includes(userId);
      return {
        ...c,
        memberIds: has
          ? c.memberIds.filter((id) => id !== userId)
          : [...c.memberIds, userId].slice(0, 40),
      };
    });
    void persist(next);
  }

  function removeCircle(id: string) {
    void persist(local.filter((c) => c.id !== id));
  }

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-5">
      <h2 className="font-display text-lg font-semibold text-white">
        Friend circles
      </h2>
      <p className="mt-1 text-xs text-mist/70">
        Named squads for invite targeting (College, Roommates…). Soft-launch MVP —
        private to you.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New circle name"
          className="min-w-[160px] flex-1 rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={addCircle}
          className="rounded-lg bg-teal/20 px-3 py-2 text-xs font-semibold text-teal-soft disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {local.length === 0 ? (
        <p className="mt-3 text-xs text-mist/60">No circles yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {local.map((c) => (
            <li key={c.id} className="rounded-xl border border-line/70 bg-ink/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">{c.name}</p>
                <button
                  type="button"
                  onClick={() => removeCircle(c.id)}
                  className="text-[11px] text-mist/60 hover:text-amber-soft"
                >
                  Delete
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {friends.map((f) => {
                  const on = c.memberIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleMember(c.id, f.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        on
                          ? "border-teal/40 bg-teal/15 text-teal-soft"
                          : "border-line text-mist"
                      }`}
                    >
                      {f.name.split(" ")[0]}
                    </button>
                  );
                })}
                {!friends.length ? (
                  <span className="text-[11px] text-mist/55">Add friends first</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-2 text-xs text-teal-soft">{msg}</p> : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DmPartyInviteCard,
  looksLikePartyInvite,
} from "@/components/DmPartyInviteCard";
import { useWatchify } from "@/lib/store";
import type { User } from "@/lib/types";

type Thread = {
  id: string;
  updatedAt: string;
  otherUser: User;
  lastMessage: {
    id: string;
    text: string;
    linkUrl: string | null;
    senderId: string;
    createdAt: string;
  } | null;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  linkUrl: string | null;
  createdAt: string;
};

function MessagesInner() {
  const search = useSearchParams();
  const { currentUserId, ready, blockUser } = useWatchify();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [other, setOther] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [safetyMsg, setSafetyMsg] = useState("");

  const refreshThreads = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (!res.ok) {
      setError("Sign in to message friends.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setThreads(data.conversations || []);
    setLoading(false);
  }, []);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setError(null);
    const res = await fetch(`/api/messages/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load chat");
      return;
    }
    setOther(data.otherUser);
    setMessages(data.messages || []);
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!ready) return;
    void refreshThreads();
    const t = window.setInterval(() => void refreshThreads(), 3000);
    return () => window.clearInterval(t);
  }, [ready, refreshThreads]);

  useEffect(() => {
    const c = search.get("c");
    if (c) void openThread(c);
  }, [search, openThread]);

  useEffect(() => {
    if (!activeId) return;
    const t = window.setInterval(() => void openThread(activeId), 2000);
    return () => window.clearInterval(t);
  }, [activeId, openThread]);

  async function send() {
    if (!activeId || (!draft.trim() && true)) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch(`/api/messages/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Send failed");
      setDraft(text);
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    void refreshThreads();
  }

  if (!currentUserId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
          <p className="mt-2 text-sm text-mist">Sign in to chat with Watchify friends.</p>
          <Link href="/auth/signin" className="mt-6 inline-block rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-ink">
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:min-h-[70vh] md:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-line bg-panel/40 md:w-72">
          <div className="border-b border-line px-4 py-3">
            <h1 className="font-display text-lg font-semibold text-white">Messages</h1>
            <p className="text-[11px] text-mist/70">Friends only · party invites welcome · near-live refresh</p>
          </div>
          {loading && <p className="p-4 text-xs text-mist">Loading…</p>}
          {!loading && threads.length === 0 && (
            <p className="p-4 text-xs text-mist">
              No chats yet. Open a friend&apos;s profile or invite them from a party.
            </p>
          )}
          <ul className="max-h-[40vh] overflow-y-auto md:max-h-[65vh]">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => void openThread(t.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                    activeId === t.id ? "bg-teal/10" : ""
                  }`}
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-ink"
                    style={{ background: `hsl(${t.otherUser.avatarHue} 70% 55%)` }}
                  >
                    {t.otherUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {t.otherUser.name}
                      </span>
                      {t.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-teal" />
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[11px] text-mist/70">
                      {t.lastMessage?.text || "Say hi"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-[50vh] flex-1 flex-col rounded-2xl border border-line bg-panel/30">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-mist">
              Select a conversation — or start one from a friend&apos;s profile.
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <p className="font-display font-semibold text-white">
                    {other?.name || "Chat"}
                  </p>
                  {other && (
                    <Link
                      href={`/profile/${other.id}`}
                      className="text-[11px] text-teal-soft hover:underline"
                    >
                      @{other.handle}
                    </Link>
                  )}
                </div>
                {other ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        blockUser(other.id);
                        setSafetyMsg(`Blocked @${other.handle}. They can’t DM or invite you.`);
                        setActiveId(null);
                        setOther(null);
                        void refreshThreads();
                      }}
                      className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-mist hover:border-amber/40 hover:text-amber-soft"
                    >
                      Block
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void fetch("/api/report", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            targetUserId: other.id,
                            targetKind: "user",
                            reason: "inappropriate_user",
                            details: `Reported from messages thread`,
                          }),
                        }).then(async (res) => {
                          const data = await res.json();
                          setSafetyMsg(
                            res.ok
                              ? "Report submitted. Thanks for helping keep Watchify safer."
                              : data.error || "Report failed"
                          );
                        });
                      }}
                      className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-mist hover:border-amber/40 hover:text-amber-soft"
                    >
                      Report
                    </button>
                  </div>
                ) : null}
              </header>
              {safetyMsg ? (
                <p className="border-b border-line px-4 py-2 text-[11px] text-mist/80">
                  {safetyMsg}
                </p>
              ) : null}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "ml-auto bg-teal/20 text-white"
                          : "bg-white/5 text-mist"
                      }`}
                    >
                      <p>{m.text}</p>
                      {m.linkUrl ? (
                        looksLikePartyInvite(m.linkUrl) ? (
                          <DmPartyInviteCard linkUrl={m.linkUrl} />
                        ) : (
                          <a
                            href={m.linkUrl}
                            className="mt-1 block break-all text-[11px] text-teal-soft underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {m.linkUrl}
                          </a>
                        )
                      ) : null}
                      <p className="mt-1 text-[10px] opacity-50">
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              {error && (
                <p className="px-4 text-xs text-amber-soft">{error}</p>
              )}
              <form
                className="flex gap-2 border-t border-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message a friend…"
                  className="flex-1 rounded-xl border border-line bg-ink/40 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-teal/40"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-ink"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-mist">Loading messages…</p>
        </AppShell>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}

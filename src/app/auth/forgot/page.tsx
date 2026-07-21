"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setPreviewUrl("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Request failed");
      return;
    }
    setMsg(data.message || "If that email exists, a reset link was sent.");
    if (data.previewUrl) setPreviewUrl(data.previewUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-mist/80">
          We&apos;ll email a reset link. In local/dev without an email key, the
          link is printed in the server console.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-teal/40"
          />
          {msg && <p className="text-sm text-mist">{msg}</p>}
          {previewUrl && (
            <p className="break-all text-xs text-teal-soft">
              Dev preview:{" "}
              <Link href={previewUrl} className="underline">
                {previewUrl}
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-sm text-mist">
          <Link href="/auth/signin" className="text-teal-soft hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

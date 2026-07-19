"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    router.push("/auth/signin?reset=1");
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
        <h1 className="font-display text-2xl font-bold text-white">
          Invalid reset link
        </h1>
        <p className="mt-3 text-sm text-mist">
          <Link href="/auth/forgot" className="text-teal-soft hover:underline">
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Reset password
      </h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="New password (8+)"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="Confirm password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-amber-soft">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-mist">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}

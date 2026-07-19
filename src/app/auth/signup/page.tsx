"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { track } from "@/lib/analytics-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/discover");

  useEffect(() => {
    setCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl") || "/discover");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    track("signup_started");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, handle, email, password, ageConfirmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Signup failed");
      return;
    }
    if (data.verificationPreviewUrl) {
      console.info(
        "[watchify] verification link (also in server console):",
        data.verificationPreviewUrl
      );
    }
    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("Account created — please sign in.");
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    track("signup_completed", { newUser: true });
    const next =
      callbackUrl === "/discover"
        ? "/discover?onboard=1"
        : callbackUrl;
    router.push(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Create account
        </h1>
        <p className="mt-2 text-sm text-mist/80">
          Join to save queues, report issues, and manage billing securely.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Handle (optional)"
            className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="auth-field w-full rounded-xl border border-line bg-ink/80 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal/40"
            style={{
              color: "#eef5f1",
              WebkitTextFillColor: "#eef5f1",
              caretColor: "#eef5f1",
            }}
          />
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Password (8+ characters)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <label className="flex items-start gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              I confirm I am <strong className="text-white">13 or older</strong>{" "}
              and agree to the{" "}
              <Link href="/terms" className="text-teal-soft hover:underline">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" className="text-teal-soft hover:underline">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/safety" className="text-teal-soft hover:underline">
                Community Guidelines
              </Link>
              .
            </span>
          </label>
          {error && <p className="text-sm text-amber-soft">{error}</p>}
          <button
            type="submit"
            disabled={loading || !ageConfirmed}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-60"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-sm text-mist">
          Already have an account?{" "}
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-teal-soft hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

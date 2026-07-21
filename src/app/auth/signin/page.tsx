"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [providers, setProviders] = useState({
    google: false,
    github: false,
    facebook: false,
  });
  const callbackUrl = params.get("callbackUrl") || "/discover";

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setProviders({
          google: Boolean(d.googleAuthConfigured),
          github: Boolean(d.githubAuthConfigured),
          facebook: Boolean(d.facebookAuthConfigured),
        });
        const demo = Boolean(d.showDemoLogin);
        setShowDemo(demo);
        if (demo) {
          setEmail((prev) => prev || "alex@watchify.app");
          setPassword((prev) => prev || "watchify-demo");
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await Promise.race([
        signIn("credentials", {
          email,
          password,
          redirect: false,
        }),
        new Promise<null>((resolve) =>
          window.setTimeout(() => resolve(null), 45000)
        ),
      ]);
      setLoading(false);
      if (!res) {
        setError(
          "Server is waking up (Render free tier can take ~1 minute). Wait, then try again."
        );
        return;
      }
      if (res.error) {
        setError(
          res.error === "ACCOUNT_BANNED"
            ? "This account has been suspended."
            : "Invalid email or password. Demo accounts are not seeded on production — create an account or use one you already made."
        );
        return;
      }
      router.push(callbackUrl);
    } catch {
      setLoading(false);
      setError(
        "Sign-in failed to reach the server. If the site just woke from sleep, wait a few seconds and retry."
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Sign in</h1>
      {showDemo && (
        <p className="mt-2 text-sm text-mist/80">
          Soft-launch login: <code className="text-teal-soft">alex@watchify.app</code> /{" "}
          <code className="text-teal-soft">watchify-demo</code>
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="auth-field w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-teal/40"
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Password"
          required
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-amber-soft">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-ink hover:bg-teal-soft disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {(providers.google || providers.github || providers.facebook) && (
        <div className="mt-4 space-y-2">
          {providers.google && (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
            >
              Continue with Google
            </button>
          )}
          {providers.facebook && (
            <button
              type="button"
              onClick={() => signIn("facebook", { callbackUrl })}
              className="w-full rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
            >
              Continue with Facebook
            </button>
          )}
          {providers.github && (
            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl })}
              className="w-full rounded-xl border border-line px-4 py-2.5 text-sm text-mist hover:text-white"
            >
              Continue with GitHub
            </button>
          )}
        </div>
      )}
      {!providers.google && !providers.github && !providers.facebook && (
        <p className="mt-4 text-xs text-mist/60">
          Email + password only right now. Add Google / Facebook / GitHub OAuth
          env vars on Render to enable social login.
        </p>
      )}
        <p className="mt-6 text-sm text-mist">
          <Link href="/auth/forgot" className="text-teal-soft hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-3 text-sm text-mist">
          New here?{" "}
          <Link href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-teal-soft hover:underline">
            Create an account
          </Link>
        </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-mist">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </main>
  );
}

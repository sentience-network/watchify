"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { clearGuestUid } from "@/components/GuestMergeBridge";
import { track } from "@/lib/analytics-client";

export default function SignUpPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/discover");
  const [fromGuest, setFromGuest] = useState(false);

  const sessionIsGuest =
    Boolean(session?.user?.isGuest) ||
    Boolean(session?.user?.email?.endsWith("@guest.watchify.local"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "/discover");
    setFromGuest(params.get("from") === "guest");
  }, []);

  useEffect(() => {
    if (sessionIsGuest && session?.user?.name && !name) {
      setName(session.user.name);
      setAgeConfirmed(true);
    }
  }, [sessionIsGuest, session?.user?.name, name]);

  const convertingGuest = fromGuest && sessionIsGuest;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    track("signup_started");

    const endpoint = convertingGuest ? "/api/auth/guest-convert" : "/api/auth/signup";
    const body = convertingGuest
      ? {
          mode: "upgrade",
          name,
          handle,
          email,
          password,
          ageConfirmed,
        }
      : { name, handle, email, password, ageConfirmed };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    clearGuestUid();
    try {
      sessionStorage.removeItem("watchify_guest_convert");
    } catch {
      /* ignore */
    }
    track("signup_completed", {
      newUser: true,
      partyTrial: true,
      source: convertingGuest ? "guest_upgrade" : "credentials",
    });
    const next =
      convertingGuest && callbackUrl.startsWith("/parties")
        ? callbackUrl
        : callbackUrl === "/discover"
          ? "/discover?onboard=1&trial=1"
          : callbackUrl.includes("?")
            ? `${callbackUrl}&trial=1`
            : `${callbackUrl}?trial=1`;
    router.push(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          {convertingGuest ? "Save your guest session" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-mist/80">
          {convertingGuest ? (
            <>
              Keep the party you just joined, your display name, and Ready
              history — then unlock{" "}
              <strong className="text-teal-soft">30 days of Party</strong>.
            </>
          ) : (
            <>
              Includes <strong className="text-teal-soft">30 days of Party</strong>{" "}
              free — host live rooms, face video, and Party cosmetics. Then Free
              (with one free host credit) unless you upgrade.
            </>
          )}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-teal/40"
          />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Handle (optional)"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-teal/40"
          />
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
            {loading
              ? convertingGuest
                ? "Saving…"
                : "Creating…"
              : convertingGuest
                ? "Save account & keep party"
                : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-sm text-mist">
          Already have an account?{" "}
          <Link
            href={`/auth/signin?from=${convertingGuest ? "guest" : ""}&callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-teal-soft hover:underline"
          >
            Sign in
            {convertingGuest ? " to link this guest session" : ""}
          </Link>
        </p>
      </div>
    </main>
  );
}

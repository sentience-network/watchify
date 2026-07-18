"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Verification failed");
        return;
      }
      setStatus("ok");
      setMessage("Email verified. You can continue using Watchify.");
      setTimeout(() => router.push("/discover"), 1500);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel/60 p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-teal">Watchify</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        Verify email
      </h1>
      <p
        className={`mt-4 text-sm ${
          status === "error" ? "text-amber-soft" : "text-mist"
        }`}
      >
        {message}
      </p>
      <p className="mt-6 text-sm text-mist">
        <Link href="/auth/signin" className="text-teal-soft hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-mist">Loading…</p>}>
        <VerifyForm />
      </Suspense>
    </main>
  );
}

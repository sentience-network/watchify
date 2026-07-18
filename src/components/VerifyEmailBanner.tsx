"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

/** Shown until email is verified (demo seed users are pre-verified). */
export function VerifyEmailBanner() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (status !== "authenticated" || !session?.user?.id) return null;
  if (session.user.emailVerified) return null;

  async function resend() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/auth/verify", { method: "PUT" });
    const data = await res.json();
    setBusy(false);
    if (data.alreadyVerified) {
      setMsg("Already verified — refresh the page.");
      return;
    }
    if (data.previewUrl) {
      setMsg(`Dev link: ${data.previewUrl}`);
      return;
    }
    setMsg(data.ok ? "Verification email sent." : data.error || "Failed");
  }

  return (
    <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-soft">
      <p>
        Verify your email to unlock full account recovery and billing notices.{" "}
        <button
          type="button"
          disabled={busy}
          onClick={() => void resend()}
          className="font-semibold underline disabled:opacity-50"
        >
          {busy ? "Sending…" : "Resend link"}
        </button>
      </p>
      {msg && (
        <p className="mt-1 break-all text-xs text-mist">
          {msg.startsWith("Dev link:") ? (
            <>
              Dev link:{" "}
              <Link
                href={msg.replace("Dev link: ", "")}
                className="text-teal-soft underline"
              >
                open verify
              </Link>
            </>
          ) : (
            msg
          )}
        </p>
      )}
    </div>
  );
}

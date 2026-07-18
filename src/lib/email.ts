import { getAppUrl } from "./site";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailTransport = "resend" | "smtp" | "ethereal" | "console";

export function getEmailTransport(): EmailTransport {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return "smtp";
  }
  // Prefer Ethereal catch-all inboxes over bare console when nodemailer is available.
  if (process.env.WATCHIFY_EMAIL_ETHEREAL !== "false") return "ethereal";
  return "console";
}

export function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Watchify <onboarding@resend.dev>"
  );
}

/** Sends email via Resend, SMTP (Nodemailer), Ethereal test inbox, or console. */
export async function sendEmail(
  input: SendEmailInput
): Promise<
  | { ok: true; transport: EmailTransport; previewUrl?: string }
  | { ok: false; error: string }
> {
  const transport = getEmailTransport();
  const from = emailFromAddress();

  if (transport === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[watchify:email] Resend failed", res.status, body);
        return { ok: false, error: "Email provider error" };
      }
      return { ok: true, transport };
    } catch (err) {
      console.error("[watchify:email] Resend exception", err);
      return { ok: false, error: "Email send failed" };
    }
  }

  if (transport === "smtp") {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { ok: true, transport };
    } catch (err) {
      console.error("[watchify:email] SMTP exception", err);
      return { ok: false, error: "SMTP send failed" };
    }
  }

  if (transport === "ethereal") {
    try {
      const nodemailer = await import("nodemailer");
      const account = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
      const info = await transporter.sendMail({
        from: `Watchify <${account.user}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.info(
        [
          "",
          "══════════════════════════════════════════════",
          "[watchify:email] ETHEREAL (real SMTP test inbox)",
          `To:      ${input.to}`,
          `Subject: ${input.subject}`,
          previewUrl ? `Preview: ${previewUrl}` : "",
          "══════════════════════════════════════════════",
          "",
        ]
          .filter(Boolean)
          .join("\n")
      );
      return { ok: true, transport: "ethereal", previewUrl };
    } catch (err) {
      console.error("[watchify:email] Ethereal failed, falling back to console", err);
    }
  }

  // Last-resort fallback — link is printed for the operator
  console.info(
    [
      "",
      "══════════════════════════════════════════════",
      "[watchify:email] CONSOLE FALLBACK",
      `To:      ${input.to}`,
      `Subject: ${input.subject}`,
      "────────",
      input.text,
      "══════════════════════════════════════════════",
      "",
    ].join("\n")
  );
  return { ok: true, transport: "console" };
}

export function verificationEmailContent(token: string) {
  const url = `${getAppUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  return {
    subject: "Verify your Watchify email",
    text: `Welcome to Watchify.\n\nVerify your email:\n${url}\n\nThis link expires in 24 hours.`,
    html: `<p>Welcome to Watchify.</p><p><a href="${url}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
    url,
  };
}

export function passwordResetEmailContent(token: string) {
  const url = `${getAppUrl()}/auth/reset?token=${encodeURIComponent(token)}`;
  return {
    subject: "Reset your Watchify password",
    text: `Reset your Watchify password:\n${url}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p><a href="${url}">Reset your Watchify password</a></p><p>This link expires in 1 hour.</p>`,
    url,
  };
}

import { createHash, randomBytes } from "crypto";
import { prisma } from "../db";
import {
  passwordResetEmailContent,
  sendEmail,
  verificationEmailContent,
} from "../email";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newRawToken(): string {
  return randomBytes(32).toString("hex");
}

export async function issueEmailVerification(
  userId: string,
  email: string
): Promise<{ ok: true; previewUrl?: string } | { ok: false; error: string }> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  const raw = newRawToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  const content = verificationEmailContent(raw);
  const sent = await sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  if (!sent.ok) return { ok: false, error: sent.error };
  return {
    ok: true,
    previewUrl: sent.transport === "console" ? content.url : undefined,
  };
}

export async function consumeEmailVerification(
  rawToken: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const tokenHash = hashToken(rawToken);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
  if (!row) return { ok: false, error: "Invalid or expired verification link." };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: row.id } });
    return { ok: false, error: "Verification link expired. Request a new one." };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { ok: true, userId: row.userId };
}

export async function issuePasswordReset(
  userId: string,
  email: string
): Promise<{ ok: true; previewUrl?: string } | { ok: false; error: string }> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const raw = newRawToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  const content = passwordResetEmailContent(raw);
  const sent = await sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  if (!sent.ok) return { ok: false, error: sent.error };
  return {
    ok: true,
    previewUrl: sent.transport === "console" ? content.url : undefined,
  };
}

export async function consumePasswordReset(
  rawToken: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const tokenHash = hashToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!row) return { ok: false, error: "Invalid or expired reset link." };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: row.id } });
    return { ok: false, error: "Reset link expired. Request a new one." };
  }
  const { hash } = await import("bcryptjs");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: await hash(newPassword, 10),
        // Resetting via email also confirms ownership
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);
  return { ok: true };
}

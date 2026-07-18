/** Lightweight sanitization for user-generated text shown in the UI. */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(input: string, maxLen = 500): string {
  return input
    .replace(CONTROL, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase().slice(0, 254);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

#!/usr/bin/env node
/**
 * Launch readiness gate — fail CI / pre-deploy if prod secrets missing.
 * Usage: node scripts/launch-check.mjs [--prod]
 */
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(__dirname, "../.env"));
loadEnvFile(resolve(__dirname, "../.env.local"));

const requiredProd = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_REALTIME_URL",
  "TOKEN_ENCRYPTION_SECRET",
];

const recommended = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRICE_PLUS",
  "STRIPE_PRICE_PARTY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "TMDB_API_KEY",
  "TURN_URL",
  "TURN_USER",
  "TURN_PASS",
  "REALTIME_SECRET",
];

const isProd =
  process.env.NODE_ENV === "production" || process.argv.includes("--prod");

function present(key) {
  const v = process.env[key];
  return Boolean(v && String(v).trim());
}

const missingReq = requiredProd.filter((k) => !present(k));
const missingRec = recommended.filter((k) => !present(k));

console.log(`Watchify launch check (${isProd ? "production" : "local"})`);
console.log("─".repeat(48));

if (missingReq.length) {
  console.log("BLOCKERS:");
  missingReq.forEach((k) => console.log(`  ✗ ${k}`));
} else {
  console.log("Required secrets: OK");
}

if (missingRec.length) {
  console.log("Recommended (launch quality):");
  missingRec.forEach((k) => console.log(`  · ${k} missing`));
} else {
  console.log("Recommended secrets: OK");
}

if (isProd && process.env.WATCHIFY_DEV_BILLING === "true") {
  console.log("BLOCKER: WATCHIFY_DEV_BILLING must not be true in production");
  missingReq.push("WATCHIFY_DEV_BILLING");
}

if (isProd && process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true") {
  console.log("WARN: NEXT_PUBLIC_SHOW_DEMO_LOGIN=true in production");
}

const ok = missingReq.length === 0;
console.log("─".repeat(48));
console.log(ok ? "GO (core)" : "NO-GO");
if (ok && missingRec.length) {
  console.log(
    `Note: ${missingRec.length} recommended keys still missing for full launch quality.`
  );
}
process.exit(ok ? 0 : 1);

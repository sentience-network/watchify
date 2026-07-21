/**
 * Soft-launch check: sign in as tester01 and verify streaming link persists
 * via /api/me + /api/me/state (not Netflix OAuth — subscribe badge only).
 *
 * Usage: node scripts/check-link-accounts.mjs
 * Reads testers-credentials.txt (gitignored).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base =
  process.env.WATCHIFY_BASE_URL || "https://watchify-web-9rx1.onrender.com";

const lines = readFileSync(resolve(root, "testers-credentials.txt"), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.includes("@watchify.app"));
if (!lines.length) {
  console.error("No tester rows in testers-credentials.txt");
  process.exit(1);
}
const [email, password] = lines[0].split("\t");

function getCookie(res, name) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    if (c.startsWith(name + "=")) return c.split(";")[0];
  }
  return null;
}

function mergeCookies(...jar) {
  const map = new Map();
  for (const c of jar.filter(Boolean)) {
    const [k] = c.split("=");
    map.set(k, c);
  }
  return [...map.values()].join("; ");
}

const csrfRes = await fetch(`${base}/api/auth/csrf`);
const csrfJson = await csrfRes.json();
const csrfCookie =
  getCookie(csrfRes, "next-auth.csrf-token") ||
  getCookie(csrfRes, "__Host-next-auth.csrf-token") ||
  getCookie(csrfRes, "__Secure-next-auth.csrf-token");

const body = new URLSearchParams({
  csrfToken: csrfJson.csrfToken,
  email,
  password,
  callbackUrl: `${base}/settings`,
  json: "true",
});

const loginRes = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: csrfCookie || "",
  },
  body,
  redirect: "manual",
});
const setCookies = loginRes.headers.getSetCookie?.() || [];
const cookieHeader = mergeCookies(
  csrfCookie,
  ...setCookies.map((c) => c.split(";")[0])
);

if (!/session-token=/.test(cookieHeader)) {
  console.error("FAIL: no session cookie after login", loginRes.status);
  process.exit(1);
}

const config = await (await fetch(`${base}/api/config`)).json();
console.log("traktConfigured", config.traktConfigured);

async function meLinked() {
  const res = await fetch(`${base}/api/me`, { headers: { Cookie: cookieHeader } });
  const json = await res.json();
  return { status: res.status, linked: json.linkedServices || [] };
}

async function stateLinked() {
  const res = await fetch(`${base}/api/me/state`, {
    headers: { Cookie: cookieHeader },
  });
  const json = await res.json();
  return { status: res.status, linked: json.state?.linkedServices || [] };
}

const before = await meLinked();
const service = before.linked.includes("hulu") ? "disney" : "hulu";

const patch = await fetch(`${base}/api/me`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: cookieHeader },
  body: JSON.stringify({ linkService: service }),
});
const patchJson = await patch.json();
if (!patch.ok || !patchJson.linkedServices?.includes(service)) {
  console.error("FAIL: link PATCH", patch.status, patchJson);
  process.exit(1);
}

const afterMe = await meLinked();
const afterState = await stateLinked();
if (!afterMe.linked.includes(service) || !afterState.linked.includes(service)) {
  console.error("FAIL: persistence", { afterMe, afterState });
  process.exit(1);
}

const un = await fetch(`${base}/api/me`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: cookieHeader },
  body: JSON.stringify({ unlinkService: service }),
});
const unJson = await un.json();
if (!un.ok || unJson.linkedServices?.includes(service)) {
  console.error("FAIL: unlink", un.status, unJson);
  process.exit(1);
}

console.log("OK: streaming link/unlink persists via /api/me and /api/me/state");
console.log(`  linked ${service} → verified → unlinked`);
if (!config.traktConfigured) {
  console.log(
    "NOTE: Trakt Connect still blocked until Render has TRAKT_* + TOKEN_ENCRYPTION_SECRET"
  );
}

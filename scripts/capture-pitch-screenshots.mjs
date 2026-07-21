/**
 * Capture investor pitch screenshots from live (or local) Watchify.
 *
 *   node scripts/capture-pitch-screenshots.mjs
 *   WATCHIFY_URL=http://localhost:3344 node scripts/capture-pitch-screenshots.mjs
 *
 * Reads gitignored testers-credentials.txt — never logs passwords.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE =
  process.env.WATCHIFY_URL || "https://watchify-web-9rx1.onrender.com";
const outDir = join(root, "docs", "pitch", "screenshots");
const credsPath = join(root, "testers-credentials.txt");
const LANDING_ONLY = process.env.LANDING_ONLY === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadTester() {
  if (!existsSync(credsPath)) {
    throw new Error("Missing testers-credentials.txt");
  }
  const rows = readFileSync(credsPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes("@watchify.app") && l.includes("\t"));
  if (!rows.length) throw new Error("No tester rows found");
  const [email, password, handle] = rows[0].split("\t");
  return { email, password, handle };
}

async function dismissOverlays(page) {
  for (const label of [/accept$/i, /essential only/i, /got it/i, /^later$/i]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.count()) {
      try {
        await btn.click({ timeout: 1200 });
        await sleep(200);
      } catch {
        /* ignore */
      }
    }
  }
}

async function shot(page, name) {
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", name);
  return path;
}

async function waitReady(page, { timeout = 45000 } = {}) {
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Loading parties/i.test(t)) return false;
        if (/^Loading[.…]*$/m.test(t.trim().slice(0, 40))) return false;
        // hydrated app chrome
        return (
          /Watchify Parties|Start a party|Create party|For you|Account & privacy|Watchify profile|SOCIAL STREAMING/i.test(
            t
          ) || t.length > 800
        );
      },
      { timeout }
    )
    .catch(() => undefined);
  await sleep(800);
  await dismissOverlays(page);
}

async function wakeSite(page) {
  console.log("Waking", BASE, "…");
  for (let i = 0; i < 4; i++) {
    try {
      const res = await page.goto(BASE, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      if (res && (res.ok() || res.status() === 304)) {
        await sleep(2000);
        return;
      }
    } catch (e) {
      console.log("wake attempt", i + 1, e.message);
    }
    await sleep(8000);
  }
  throw new Error("Could not wake site");
}

async function signIn(page, account) {
  await page.goto(`${BASE}/auth/signin`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await dismissOverlays(page);
  await page.getByPlaceholder("Email").fill(account.email);
  await page.getByPlaceholder("Password").fill(account.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), {
    timeout: 60000,
  });
  await sleep(2000);
  await dismissOverlays(page);
}

async function resolveProfileId(page) {
  const fromApi = await page
    .evaluate(async () => {
      for (const path of ["/api/me", "/api/auth/session"]) {
        try {
          const r = await fetch(path);
          if (!r.ok) continue;
          const j = await r.json();
          return (
            j?.id ||
            j?.user?.id ||
            j?.userId ||
            j?.user?.userId ||
            null
          );
        } catch {
          /* try next */
        }
      }
      return null;
    })
    .catch(() => null);
  if (fromApi) return fromApi;

  const href = await page
    .locator('a[href^="/profile/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (href) return href.split("/").filter(Boolean).pop();
  return null;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const manifest = [];

  try {
    await wakeSite(page);

    // Landing — signed out
    await context.clearCookies();
    await page.goto(BASE, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await sleep(3000);
    await dismissOverlays(page);
    // Wait for poster spiral / brand
    await page.waitForSelector("text=Watchify", { timeout: 30000 });
    await shot(page, "01-landing.png");
    manifest.push("01-landing.png");

    if (LANDING_ONLY) {
      console.log("LANDING_ONLY=1 — stopping after landing");
      return;
    }

    const account = loadTester();
    console.log("Using tester", account.email, account.handle || "");
    await signIn(page, account);

    await page.goto(`${BASE}/discover`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await waitReady(page);
    await shot(page, "02-discover.png");
    manifest.push("02-discover.png");

    await page.goto(`${BASE}/parties`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await waitReady(page, { timeout: 60000 });
    // Prefer create panel expanded for lobby shot
    const createToggle = page
      .getByRole("button", { name: /create|host|start a party|new party/i })
      .first();
    if (await createToggle.count()) {
      await createToggle.click().catch(() => undefined);
      await sleep(1000);
    }
    await shot(page, "03-party-lobby.png");
    manifest.push("03-party-lobby.png");

    // Watch Match on parties page
    const wm = page.getByText("Watch Match").first();
    if (await wm.count()) {
      await wm.scrollIntoViewIfNeeded();
      await sleep(600);
      await shot(page, "07-watch-match.png");
      manifest.push("07-watch-match.png");
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(400);
    }

    // In-party: open existing room or stay on enriched lobby
    const partyLink = page.locator('a[href^="/parties/"]').first();
    if (await partyLink.count()) {
      await partyLink.click();
      await sleep(4000);
      await waitReady(page);
      await shot(page, "04-in-party.png");
      manifest.push("04-in-party.png");
    } else {
      // Join first listed open party button
      const joinBtn = page
        .getByRole("button", { name: /^Join/i })
        .or(page.getByRole("link", { name: /^Join/i }))
        .first();
      if (await joinBtn.count()) {
        await joinBtn.click();
        await sleep(4000);
        await waitReady(page);
      }
      await shot(page, "04-in-party.png");
      manifest.push("04-in-party.png");
    }

    const profileId = await resolveProfileId(page);
    if (profileId) {
      await page.goto(`${BASE}/profile/${profileId}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await waitReady(page);
      const customize = page
        .getByRole("button", {
          name: /customize|edit (profile|look)|appearance|change look/i,
        })
        .first();
      if (await customize.count()) {
        await customize.click().catch(() => undefined);
        await sleep(1800);
      }
      await shot(page, "05-profile.png");
      manifest.push(`05-profile.png (${profileId})`);
    } else {
      console.warn("Could not resolve profile id");
    }

    await page.goto(`${BASE}/settings`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await waitReady(page);
    const linkSection = page
      .getByText(/Link accounts|Linked services|Deep link|Subscribe badge/i)
      .first();
    if (await linkSection.count()) {
      await linkSection.scrollIntoViewIfNeeded();
      await sleep(600);
    } else {
      await page.evaluate(() => window.scrollBy(0, 700));
      await sleep(500);
    }
    await shot(page, "06-settings-link.png");
    manifest.push("06-settings-link.png");

    writeFileSync(
      join(outDir, "MANIFEST.txt"),
      [
        `Captured: ${new Date().toISOString()}`,
        `URL: ${BASE}`,
        `Tester: ${account.email}`,
        "",
        ...manifest,
      ].join("\n"),
      "utf8"
    );
    console.log("Done. Files in docs/pitch/screenshots/");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

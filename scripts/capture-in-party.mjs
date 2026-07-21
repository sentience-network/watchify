/**
 * Create a Free party and capture the in-party room.
 */
import { chromium } from "playwright";
import { readFileSync, renameSync, existsSync, statSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const LIVE = "https://watchify-web-9rx1.onrender.com";
const outDir = join(root, "docs", "pitch", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [email, password] = readFileSync(
    join(root, "testers-credentials.txt"),
    "utf8"
  )
    .split(/\r?\n/)
    .find((l) => l.includes("@watchify.app") && l.includes("\t"))
    .split("\t");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${LIVE}/auth/signin`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/auth/signin"), {
    timeout: 60000,
  });

  // Warm store
  await page.goto(`${LIVE}/discover`, { waitUntil: "domcontentloaded" });
  await page.getByText(/Watch together tonight/i).waitFor({ timeout: 60000 });
  // Wait for wake banner to clear if present
  for (let i = 0; i < 45; i++) {
    const t = await page.locator("body").innerText();
    if (!/Waking the server/i.test(t)) break;
    await sleep(1000);
  }
  await sleep(2000);

  await page.goto(`${LIVE}/parties?create=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText(/Create a party|Watch together/i).first().waitFor({
    timeout: 60000,
  });
  for (let i = 0; i < 40; i++) {
    const t = await page.locator("body").innerText();
    if (!/Waking the server|Loading parties/i.test(t)) break;
    await sleep(1000);
  }
  await sleep(1500);

  // Ensure create form expanded
  const startCreate = page.getByRole("button", { name: /Start create/i });
  if (await startCreate.count()) {
    await startCreate.click();
    await sleep(800);
  }

  // Confirm title selected (Big Buck Bunny from watching)
  const body = await page.locator("body").innerText();
  if (!/Big Buck Bunny/i.test(body)) {
    console.log("No title preselected — trying TitlePicker");
  }

  await page
    .getByPlaceholder(/Room name|Friday/i)
    .fill(`Pitch party ${Date.now().toString().slice(-4)}`);

  // Listen for create response
  const createWait = page.waitForResponse(
    (r) => r.url().includes("/api/parties") && r.request().method() === "POST",
    { timeout: 30000 }
  ).catch(() => null);

  await page.getByRole("button", { name: /Create party → invite link/i }).click();
  const resp = await createWait;
  if (resp) {
    console.log("create status", resp.status(), await resp.text().catch(() => ""));
  }

  await sleep(3000);
  console.log("url after create", page.url());

  // If still on list, open highlighted / first party detail
  if (!/\/parties\/[^/?]+/.test(page.url())) {
    // Check for error text
    const err = page.locator("text=/Pick a title|Could not|error/i").first();
    if (await err.count()) {
      console.log("error:", await err.innerText());
    }
    // Open parties list cards — look for Join or party name links
    const detail = page.locator('a[href*="/parties/"]').first();
    if (await detail.count()) {
      console.log("opening", await detail.getAttribute("href"));
      await detail.click();
      await sleep(4000);
    }
  }

  // Dismiss cookie if needed
  const accept = page.getByRole("button", { name: /^Accept$/i });
  if (await accept.count()) await accept.click().catch(() => undefined);

  await page.screenshot({ path: join(outDir, "04-in-party.png") });
  console.log("final url", page.url());

  // If we have a party id URL, also try the party page with chat visible
  const m = page.url().match(/\/parties\/([^/?]+)/);
  if (m) {
    await sleep(2000);
    await page.screenshot({ path: join(outDir, "04-in-party.png") });
  }

  await browser.close();

  const p = join(outDir, "04-in-party.png");
  if (existsSync(p)) {
    await sharp(p).png({ compressionLevel: 9 }).toFile(p + ".tmp");
    renameSync(p + ".tmp", p);
    console.log("04 size", Math.round(statSync(p).size / 1024), "KB");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const base = process.env.WATCHIFY_URL || "https://watchify-web-9rx1.onrender.com";
const outDir = path.join(process.cwd(), ".tmp-mobile-audit");
fs.mkdirSync(outDir, { recursive: true });

const urls = ["/", "/discover", "/parties", "/settings", "/auth/signin"];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const report = [];

for (const u of urls) {
  try {
    await page.goto(base + u, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const overflowX =
        Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
      const fixed = [...document.querySelectorAll("*")]
        .filter((el) => getComputedStyle(el).position === "fixed")
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            cls: String(el.className || "").slice(0, 90),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            h: Math.round(r.height),
          };
        })
        .filter((x) => x.h > 20)
        .slice(0, 14);
      const smallTaps = [...document.querySelectorAll("a,button")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.height > 0 &&
            r.height < 40 &&
            r.bottom > window.innerHeight - 180
          );
        })
        .slice(0, 10)
        .map((el) => ({
          t: (el.textContent || "").trim().slice(0, 28),
          h: Math.round(el.getBoundingClientRect().height),
          w: Math.round(el.getBoundingClientRect().width),
        }));
      return {
        overflowX,
        vw: window.innerWidth,
        vh: window.innerHeight,
        fixed,
        smallTaps,
        title: document.title,
      };
    });
    const shot = path.join(outDir, `${u.replace(/\//g, "_") || "home"}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.push({ url: u, shot, ...metrics });
  } catch (e) {
    report.push({ url: u, error: String(e.message || e) });
  }
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();

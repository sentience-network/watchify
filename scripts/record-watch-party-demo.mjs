/**
 * Rich Watchify soft-launch demo:
 * TMDB catalog → create party → guest join → free playback + live chat/reactions
 * → webcam video room → screen share → social Share menu.
 *
 * Uses fake camera/mic + auto desktop-capture so Playwright can demo WebRTC
 * without a human approving OS permission dialogs.
 *
 *   node scripts/record-watch-party-demo.mjs
 */
import { chromium } from "playwright";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE =
  process.env.WATCHIFY_URL || "https://watchify-web-9rx1.onrender.com";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(root, "demos", `watch-party-rich-${stamp}`);
const credsPath = join(root, "testers-credentials.txt");
const PARTY_NAME = `Demo night ${stamp.slice(11, 16)}`;

function loadTesters() {
  if (!existsSync(credsPath)) {
    throw new Error("Missing testers-credentials.txt");
  }
  const rows = readFileSync(credsPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes("@watchify.app") && l.includes("\t"));
  if (rows.length < 2) throw new Error("Need at least 2 tester rows");
  const parse = (line) => {
    const [email, password, handle] = line.split("\t");
    return { email, password, handle };
  };
  return { host: parse(rows[0]), guest: parse(rows[1]) };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findFfmpeg() {
  return (
    process.env.FFMPEG_PATH ||
    "ffmpeg" ||
    join(
      process.env.LOCALAPPDATA || "",
      "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe"
    )
  );
}

function startDesktopCapture(outMp4) {
  const ffmpeg = findFfmpeg();
  const child = spawn(
    ffmpeg,
    [
      "-y",
      "-f",
      "gdigrab",
      "-framerate",
      "24",
      "-offset_x",
      "0",
      "-offset_y",
      "0",
      "-video_size",
      "1920x1080",
      "-i",
      "desktop",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-t",
      "300",
      outMp4,
    ],
    { stdio: ["ignore", "ignore", "pipe"], windowsHide: true }
  );
  let err = "";
  child.stderr.on("data", (d) => {
    err += d.toString();
  });
  return {
    stop: () =>
      new Promise((resolveStop) => {
        if (child.exitCode !== null) return resolveStop(err);
        child.on("exit", () => resolveStop(err));
        try {
          child.kill("SIGINT");
        } catch {
          child.kill();
        }
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
          resolveStop(err);
        }, 4000);
      }),
  };
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

async function signIn(page, account) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(page);
  await page.getByPlaceholder("Email").fill(account.email);
  await page.getByPlaceholder("Password").fill(account.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), {
    timeout: 45000,
  });
  await sleep(1200);
  await dismissOverlays(page);
}

async function demoTmdbLibrary(page) {
  await page.goto(`${BASE}/discover`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(page);
  await sleep(2000);

  // Titles search (TMDB)
  const titlesChip = page.getByRole("button", { name: /^Titles$/i });
  if (await titlesChip.count()) await titlesChip.click();
  const search = page.getByPlaceholder(/search|tmdb|movie/i).first();
  await search.fill("Inception");
  await sleep(2800);
  await page.screenshot({ path: join(outDir, "01-tmdb-search.png") });

  // Open first title result if present
  const titleLink = page.locator('a[href^="/watch/"]').first();
  if (await titleLink.count()) {
    await titleLink.click();
    await sleep(2500);
    await page.screenshot({ path: join(outDir, "02-title-page.png") });
    await page.goBack().catch(() => undefined);
    await sleep(800);
  }

  // Actors & directors
  const peopleChip = page.getByRole("button", { name: /actors|directors|people/i });
  if (await peopleChip.count()) {
    await peopleChip.click();
    await search.fill("Christopher Nolan");
    await sleep(2800);
    await page.screenshot({ path: join(outDir, "03-people-search.png") });
    const person = page.locator('a[href^="/people/"]').first();
    if (await person.count()) {
      await person.click();
      await sleep(2500);
      await page.screenshot({ path: join(outDir, "04-person-page.png") });
    }
  }

  await page.goto(`${BASE}/library`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(page);
  await sleep(2200);
  await page.screenshot({ path: join(outDir, "05-free-library.png") });
}

function demoRoom(page) {
  return page.getByRole("article").filter({ hasText: PARTY_NAME }).first();
}

async function ensurePlayInParty(room) {
  // Stay ON the parties page — never follow "Open free player" (leaves chat/webcam).
  const player = room.locator("video, iframe").first();
  if (await player.count()) {
    await player.scrollIntoViewIfNeeded();
    await sleep(500);
  }
  const video = room.locator("video").first();
  if (await video.count()) {
    await video.click({ force: true }).catch(() => undefined);
    await room.page().evaluate(async () => {
      const el = document.querySelector("article video");
      if (!el) return;
      el.muted = true;
      try {
        await el.play();
      } catch {
        /* autoplay policies */
      }
    });
    await sleep(2500);
    return;
  }
  // YouTube / Archive iframe — scroll into view and hold so recording sees playback UI
  const iframe = room.locator("iframe").first();
  if (await iframe.count()) {
    await iframe.scrollIntoViewIfNeeded();
    await sleep(3500);
  }
}

async function sendChat(room, text) {
  const input = room.getByPlaceholder(/party chat/i);
  if (!(await input.count())) return false;
  await input.scrollIntoViewIfNeeded();
  await input.fill(text);
  await room.getByRole("button", { name: /^Send$/i }).click();
  await sleep(900);
  return true;
}

async function react(room, emoji) {
  const btn = room.getByRole("button", { name: emoji }).first();
  if (await btn.count()) {
    await btn.click();
    await sleep(600);
  }
}

async function joinVideoRoom(room, { camera = true, mic = false } = {}) {
  const joinBtn = room.getByRole("button", { name: /join video room/i });
  if (!(await joinBtn.count())) return false;
  const cam = room.getByLabel(/join with camera/i);
  const micLabel = room.getByLabel(/join with microphone/i);
  if (await cam.count()) {
    if (camera !== (await cam.isChecked())) await cam.click();
  }
  if (await micLabel.count()) {
    if (mic !== (await micLabel.isChecked())) await micLabel.click();
  }
  await joinBtn.click();
  await sleep(3500);
  return true;
}

async function shareScreen(room) {
  const btn = room.getByRole("button", { name: /share screen with party/i });
  if (!(await btn.count())) return false;
  await btn.click();
  await sleep(4000);
  return true;
}

async function demoSocialShare(page, room) {
  // Prefer Share inside the party card
  const shareBtn = room.getByRole("button", { name: /^Share$/i }).first();
  if (!(await shareBtn.count())) return;
  await shareBtn.click();
  await sleep(1500);
  await page.screenshot({ path: join(outDir, "08-share-menu.png") });

  // Copy link (safe, no external login)
  const copy = page.getByRole("button", { name: /copy link/i }).first();
  if (await copy.count()) {
    await copy.click();
    await sleep(1200);
  }

  // Re-open and show X / Facebook / Instagram / Reddit options briefly
  if (!(await page.getByRole("button", { name: /x \/ twitter/i }).count())) {
    await shareBtn.click();
    await sleep(800);
  }
  for (const name of [/x \/ twitter/i, /facebook/i, /instagram/i, /reddit/i]) {
    const item = page.getByRole("button", { name }).first();
    if (!(await item.count())) continue;
    const popupPromise = page
      .context()
      .waitForEvent("page", { timeout: 4000 })
      .catch(() => null);
    await item.click();
    const popup = await popupPromise;
    await sleep(1800);
    if (popup) await popup.close().catch(() => undefined);
    // menu may close — reopen for next platform
    if (!(await page.getByRole("button", { name: /facebook|instagram|reddit/i }).first().count())) {
      await shareBtn.click().catch(() => undefined);
      await sleep(600);
    }
  }
  await page.screenshot({ path: join(outDir, "09-share-done.png") });
}

async function endOldHostedParties(page) {
  await page.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(page);
  await sleep(1500);
  for (let i = 0; i < 8; i++) {
    const end = page.getByRole("button", { name: /^End party$/i }).first();
    if (!(await end.count())) break;
    page.once("dialog", (d) => d.accept().catch(() => undefined));
    await end.click();
    await sleep(1200);
  }
}

async function launchBrowser(positionX) {
  return chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      `--window-position=${positionX},40`,
      "--window-size=960,1080",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--auto-select-desktop-capture-source=Entire screen",
    ],
  });
}

async function main() {
  const { host, guest } = loadTesters();
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "host-video"), { recursive: true });
  mkdirSync(join(outDir, "guest-video"), { recursive: true });

  const desktopMp4 = join(outDir, "watchify-desktop-capture.mp4");
  const capture = startDesktopCapture(desktopMp4);
  await sleep(1200);

  const hostBrowser = await launchBrowser(0);
  const guestBrowser = await launchBrowser(960);

  const hostCtx = await hostBrowser.newContext({
    viewport: { width: 960, height: 1000 },
    permissions: ["camera", "microphone"],
    recordVideo: {
      dir: join(outDir, "host-video"),
      size: { width: 960, height: 1000 },
    },
  });
  const guestCtx = await guestBrowser.newContext({
    viewport: { width: 960, height: 1000 },
    permissions: ["camera", "microphone"],
    recordVideo: {
      dir: join(outDir, "guest-video"),
      size: { width: 960, height: 1000 },
    },
  });

  await hostCtx.grantPermissions(["camera", "microphone"], { origin: BASE });
  await guestCtx.grantPermissions(["camera", "microphone"], { origin: BASE });

  const hostPage = await hostCtx.newPage();
  const guestPage = await guestCtx.newPage();

  console.log("1) Sign in host + guest");
  await Promise.all([signIn(hostPage, host), signIn(guestPage, guest)]);

  console.log("2) TMDB / Discover library tour (host)");
  await demoTmdbLibrary(hostPage);

  console.log("3) Create live free-sync party");
  // End at most 2 old rooms so the list stays readable (don't stall the demo)
  await hostPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(hostPage);
  for (let i = 0; i < 2; i++) {
    const end = hostPage.getByRole("button", { name: /^End party$/i }).first();
    if (!(await end.count())) break;
    hostPage.once("dialog", (d) => d.accept().catch(() => undefined));
    await end.click();
    await sleep(1000);
  }
  await hostPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(hostPage);
  await hostPage
    .getByRole("heading", { name: /create a party/i })
    .waitFor({ timeout: 30000 });
  await hostPage.waitForFunction(() => {
    const sel = document.querySelectorAll("form select")[1];
    return Boolean(sel?.options?.length);
  }, null, { timeout: 30000 });

  await hostPage.getByPlaceholder(/room name/i).fill(PARTY_NAME);
  await hostPage.locator("form select").first().selectOption("watchify_free");
  await sleep(800);
  await hostPage.locator("form select").nth(1).selectOption({ index: 0 });
  const live = hostPage.getByLabel(/live now/i);
  if (await live.count()) {
    if (!(await live.isChecked())) await live.check();
  }

  let party = null;
  for (let attempt = 1; attempt <= 3 && !party; attempt++) {
    console.log(`   create attempt ${attempt}`);
    const createBtn = hostPage.getByRole("button", { name: /Create party/i });
    await createBtn.scrollIntoViewIfNeeded();
    const createRespPromise = hostPage.waitForResponse(
      (r) =>
        r.url().includes("/api/parties") &&
        r.request().method() === "POST" &&
        !r.url().includes("join"),
      { timeout: 60000 }
    );
    await createBtn.click();
    try {
      const createResp = await createRespPromise;
      const createBody = await createResp.text();
      writeFileSync(join(outDir, "create-party-response.json"), createBody);
      if (!createResp.ok()) {
        console.warn("create failed", createResp.status(), createBody.slice(0, 200));
        await sleep(2000);
        continue;
      }
      party = JSON.parse(createBody).party;
    } catch (e) {
      console.warn("create wait failed", e.message);
      await hostPage.screenshot({
        path: join(outDir, `create-fail-${attempt}.png`),
      });
      await sleep(2000);
    }
  }
  if (!party?.inviteCode) {
    throw new Error("Could not create party after retries");
  }
  const inviteCode = party.inviteCode;
  const partyId = party.id;
  await hostPage
    .getByText(PARTY_NAME)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => undefined);
  await sleep(1500);
  await hostPage.screenshot({ path: join(outDir, "06-party-created.png") });

  console.log("4) Guest joins via invite API (reliable)");
  await guestPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(guestPage);
  if (await guestPage.getByText(/sign in to join/i).count()) {
    console.log("   re-signing guest…");
    await signIn(guestPage, guest);
    await guestPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
    await dismissOverlays(guestPage);
  }
  const joinResult = await guestPage.evaluate(async (code) => {
    const res = await fetch("/api/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_invite", invite: code }),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }, inviteCode);
  writeFileSync(join(outDir, "guest-join.json"), JSON.stringify(joinResult, null, 2));
  console.log("   join status", joinResult.status, joinResult.body?.ok || joinResult.body?.error || "");
  await guestPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await hostPage.goto(`${BASE}/parties`, { waitUntil: "domcontentloaded" });
  await dismissOverlays(hostPage);
  await dismissOverlays(guestPage);
  await sleep(2500);

  let hostRoom = demoRoom(hostPage);
  let guestRoom = demoRoom(guestPage);
  await hostRoom.waitFor({ timeout: 20000 });
  await guestRoom.waitFor({ timeout: 20000 });
  await hostRoom.scrollIntoViewIfNeeded();
  await guestRoom.scrollIntoViewIfNeeded();
  const inRoom = await guestRoom.getByText(/you.?re in|2 in room/i).count();
  console.log(inRoom ? "   guest is in the room" : "   WARNING: guest not fully in room");
  await dismissOverlays(hostPage);
  await dismissOverlays(guestPage);

  console.log("5) Free playback INSIDE party + chat/reactions (same screen)");
  await ensurePlayInParty(hostRoom);
  await ensurePlayInParty(guestRoom);
  await sleep(2000);

  // Keep player in view, then chat below it
  await sendChat(hostRoom, `Playing together — @${guest.handle} seeing the bunny?`);
  await sleep(1000);
  await sendChat(guestRoom, "Synced! Chat while the movie plays.");
  await react(hostRoom, "🔥");
  await react(guestRoom, "👏");
  await sendChat(hostRoom, "Reactions + chat during playback.");
  await hostRoom.locator("video, iframe").first().scrollIntoViewIfNeeded().catch(() => undefined);
  await sleep(2500);
  await hostPage.screenshot({ path: join(outDir, "07-playback-chat.png") });
  await guestPage.screenshot({ path: join(outDir, "07b-guest-playback.png") });

  console.log("6) Webcam video room (both) — still on Parties");
  await hostRoom.getByRole("heading", { name: /face-to-face video/i }).scrollIntoViewIfNeeded().catch(() => undefined);
  await joinVideoRoom(hostRoom, { camera: true, mic: false });
  await joinVideoRoom(guestRoom, { camera: true, mic: false });
  await sleep(5000);
  hostRoom = demoRoom(hostPage);
  guestRoom = demoRoom(guestPage);
  // If join didn't stick, click again
  if (await hostRoom.getByRole("button", { name: /join video room/i }).count()) {
    await joinVideoRoom(hostRoom, { camera: true, mic: false });
  }
  if (await guestRoom.getByRole("button", { name: /join video room/i }).count()) {
    await joinVideoRoom(guestRoom, { camera: true, mic: false });
  }
  await sleep(4000);
  hostRoom = demoRoom(hostPage);
  guestRoom = demoRoom(guestPage);
  const hostTile = hostRoom.getByText(/^You$/).first();
  if (await hostTile.count()) await hostTile.scrollIntoViewIfNeeded();
  await sendChat(hostRoom, "Cameras on — face-to-face while we watch.");
  await sendChat(guestRoom, "I can see your video tile!");
  await sleep(3500);
  await hostPage.screenshot({ path: join(outDir, "10-webcam.png") });
  await guestPage.screenshot({ path: join(outDir, "10b-guest-webcam.png") });

  console.log("7) Screen share from host party video room");
  await shareScreen(hostRoom);
  hostRoom = demoRoom(hostPage);
  guestRoom = demoRoom(guestPage);
  await sendChat(hostRoom, "Sharing my screen with the party (WebRTC).");
  await sendChat(guestRoom, "Got the screen share.");
  await sleep(5000);
  await hostPage.screenshot({ path: join(outDir, "11-screenshare.png") });
  await guestPage.screenshot({ path: join(outDir, "11b-guest-screenshare.png") });

  console.log("8) Social share menu (party invite) — stay on Parties");
  await demoSocialShare(hostPage, hostRoom);

  // Profile share too
  await hostPage.goto(`${BASE}/profile/tester_01`, { waitUntil: "domcontentloaded" }).catch(async () => {
    await hostPage.goto(`${BASE}/profile/${host.handle}`, {
      waitUntil: "domcontentloaded",
    });
  });
  await sleep(1500);
  const profileShare = hostPage.getByRole("button", { name: /^Share$/i }).first();
  if (await profileShare.count()) {
    await profileShare.click();
    await sleep(1500);
    await hostPage.screenshot({ path: join(outDir, "13-profile-share.png") });
    const copy = hostPage.getByRole("button", { name: /copy link/i }).first();
    if (await copy.count()) await copy.click();
    await sleep(1000);
  }

  console.log("9) Final hold — player + chat + video tiles visible");
  hostRoom = demoRoom(hostPage);
  guestRoom = demoRoom(guestPage);
  await ensurePlayInParty(hostRoom);
  await ensurePlayInParty(guestRoom);
  await sendChat(hostRoom, "Thanks for watching the soft-launch demo!");
  await sendChat(guestRoom, "Watchify party loop: catalog → party → chat → cam → share.");
  await react(hostRoom, "❤️");
  // Scroll through the stacked features so the recording catches each
  for (const sel of [
    hostRoom.locator("video, iframe").first(),
    hostPage.getByText(/party chat|you:|tester/i).first(),
    hostPage.getByRole("button", { name: /share screen with party|turn camera|leave call/i }).first(),
  ]) {
    if (await sel.count()) {
      await sel.scrollIntoViewIfNeeded().catch(() => undefined);
      await sleep(2000);
    }
  }
  await sleep(5000);

  await hostPage.screenshot({ path: join(outDir, "14-final-host.png"), fullPage: true });
  await guestPage.screenshot({ path: join(outDir, "14-final-guest.png"), fullPage: true });

  writeFileSync(
    join(outDir, "party-meta.json"),
    JSON.stringify(
      {
        base: BASE,
        hostHandle: host.handle,
        guestHandle: guest.handle,
        partyId,
        partyName: PARTY_NAME,
        invitePresent: Boolean(inviteCode),
        recordedAt: new Date().toISOString(),
        features: [
          "tmdb-discover-search",
          "people-search",
          "free-library",
          "watchify-free-playback",
          "live-chat-during-playback",
          "reactions",
          "webcam-video-room",
          "screen-share",
          "social-share-menu",
        ],
      },
      null,
      2
    )
  );

  await hostCtx.close();
  await guestCtx.close();
  await hostBrowser.close();
  await guestBrowser.close();
  const ffmpegLog = await capture.stop();
  writeFileSync(join(outDir, "ffmpeg-log-tail.txt"), ffmpegLog.slice(-4000));

  // Social-share popups create extra Playwright page videos — concat all chunks.
  const hostVids = readdirSync(join(outDir, "host-video"))
    .filter((f) => f.endsWith(".webm"))
    .map((f) => join(outDir, "host-video", f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
  const guestVids = readdirSync(join(outDir, "guest-video"))
    .filter((f) => f.endsWith(".webm"))
    .map((f) => join(outDir, "guest-video", f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);

  const hostFull = join(outDir, "host-browser.webm");
  const guestFull = join(outDir, "guest-browser.webm");
  if (hostVids.length) {
    const listPath = join(outDir, "host-concat.txt");
    writeFileSync(
      listPath,
      hostVids.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n")
    );
    await new Promise((resolveDone) => {
      const ff = spawn(
        findFfmpeg(),
        ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", hostFull],
        { stdio: "inherit", windowsHide: true }
      );
      ff.on("exit", () => resolveDone());
    });
  }
  if (guestVids.length) {
    // Guest usually one page — take the largest chunk
    const biggest = [...guestVids].sort(
      (a, b) => statSync(b).size - statSync(a).size
    )[0];
    copyFileSync(biggest, guestFull);
  }

  const sideBySide = join(outDir, "watchify-party-full-demo.mp4");
  if (existsSync(hostFull) && existsSync(guestFull)) {
    await new Promise((resolveDone) => {
      const ff = spawn(
        findFfmpeg(),
        [
          "-y",
          "-i",
          hostFull,
          "-i",
          guestFull,
          "-filter_complex",
          "[0:v]scale=960:1000:force_original_aspect_ratio=decrease,pad=960:1000:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25[l];[1:v]scale=960:1000:force_original_aspect_ratio=decrease,pad=960:1000:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25[r];[l][r]hstack=inputs=2[v]",
          "-map",
          "[v]",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          sideBySide,
        ],
        { stdio: "inherit", windowsHide: true }
      );
      ff.on("exit", () => resolveDone());
    });
  }

  const summary = {
    outDir,
    fullDemo: existsSync(sideBySide) ? sideBySide : null,
    desktopCapture: existsSync(desktopMp4) ? desktopMp4 : null,
    hostBrowser: existsSync(join(outDir, "host-browser.webm"))
      ? join(outDir, "host-browser.webm")
      : null,
    guestBrowser: existsSync(join(outDir, "guest-browser.webm"))
      ? join(outDir, "guest-browser.webm")
      : null,
  };
  writeFileSync(
    join(outDir, "README.txt"),
    [
      "Watchify rich soft-launch demo",
      `URL: ${BASE}`,
      `Party: ${PARTY_NAME}`,
      "",
      "Shown: TMDB Discover search, people search, free library,",
      "synced free playback + live chat/reactions, webcam room,",
      "screen share, social Share menu (X/FB/IG/Reddit/copy).",
      "",
      `Main video: ${summary.fullDemo || "(missing)"}`,
      "",
    ].join("\n")
  );

  console.log("\nRich demo complete.");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

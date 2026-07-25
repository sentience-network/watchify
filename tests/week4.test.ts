import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import {
  getScreenShareCapability,
  isLikelyAndroid,
  isLikelyIos,
  isLikelyIosSafari,
  supportsDisplayMedia,
} from "../src/lib/media-capabilities";
import { mapTraktTitle } from "../src/lib/server/trakt";
import { openToken, sealToken } from "../src/lib/server/sealed-token";
import { createPartyDb, joinPartyByInviteDb } from "../src/lib/server/social-db";
import { isStaffRole } from "../src/lib/roles";

test("Trakt mapping is exact and year-safe", () => {
  assert.equal(mapTraktTitle("Dune: Part Two", 2024), "m1");
  assert.equal(mapTraktTitle("Dune: Part Two", 1999), null);
  assert.equal(mapTraktTitle("Unknown external title", 2024), null);
});

test("Trakt token envelopes round-trip and reject tampering", () => {
  process.env.TOKEN_ENCRYPTION_SECRET = "week4-test-secret-with-at-least-32-characters";
  const sealed = sealToken("sensitive-token");
  assert.equal(openToken(sealed), "sensitive-token");
  assert.throws(() => openToken(`${sealed.slice(0, -1)}x`));
  assert.equal(sealed.includes("sensitive-token"), false);
});

test("analytics staff authorization excludes normal users", () => {
  assert.equal(isStaffRole("admin"), true);
  assert.equal(isStaffRole("mod"), true);
  assert.equal(isStaffRole("user"), false);
  assert.equal(isStaffRole(undefined), false);
});

test("screen share capability uses feature detection, not UA-only block", () => {
  const iosSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
  assert.equal(isLikelyIos(iosSafari), true);
  assert.equal(isLikelyIosSafari(iosSafari), true);
  assert.equal(isLikelyIos(androidChrome), false);
  assert.equal(isLikelyAndroid(androidChrome), true);
  assert.equal(isLikelyAndroid(iosSafari), false);

  // No getDisplayMedia → unsupported even on desktop UA
  const noApi = getScreenShareCapability({
    mediaDevices: null,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  });
  assert.equal(noApi.supported, false);
  assert.equal(noApi.canShare, false);
  assert.equal(supportsDisplayMedia(null), false);

  // getDisplayMedia present → supported even on iOS UA (progressive enhancement)
  const fakeMedia = {
    getDisplayMedia: async () => ({}) as MediaStream,
  } as Pick<MediaDevices, "getDisplayMedia">;
  const iosWithApi = getScreenShareCapability({
    mediaDevices: fakeMedia,
    userAgent: iosSafari,
  });
  assert.equal(iosWithApi.supported, true);
  assert.equal(iosWithApi.canShare, true);
  assert.equal(iosWithApi.isIos, true);

  // Android without API is unsupported but not labeled as iOS
  const androidNoApi = getScreenShareCapability({
    mediaDevices: null,
    userAgent: androidChrome,
  });
  assert.equal(androidNoApi.supported, false);
  assert.equal(androidNoApi.isIos, false);
  assert.equal(androidNoApi.isAndroid, true);
  assert.match(androidNoApi.unsupportedReason, /Android|Chrome/i);

  // Android with API gets mobile host tip
  const androidWithApi = getScreenShareCapability({
    mediaDevices: fakeMedia,
    userAgent: androidChrome,
  });
  assert.equal(androidWithApi.supported, true);
  assert.equal(androidWithApi.isAndroid, true);
  assert.match(androidWithApi.mobileHostTip, /Android Chrome/i);

  // iOS without API points hosts to native app / Android Chrome / desktop
  const iosNoApi = getScreenShareCapability({
    mediaDevices: null,
    userAgent: iosSafari,
  });
  assert.equal(iosNoApi.canShare, false);
  assert.match(iosNoApi.unsupportedReason, /Watchify iOS app|Android Chrome|desktop/i);

  // Native ReplayKit bridge enables share without getDisplayMedia
  const iosNative = getScreenShareCapability({
    mediaDevices: null,
    userAgent: iosSafari,
    nativeIosBridge: true,
  });
  assert.equal(iosNative.supported, false);
  assert.equal(iosNative.canShare, true);
  assert.equal(iosNative.nativeIosBridge, true);
  assert.match(iosNative.mobileHostTip, /Share Screen \(iOS\)|ReplayKit|Watchify iOS/i);
});

test("invite joins create durable membership and enforce capacity", async () => {
  const suffix = Date.now().toString(36);
  const hostId = `test_host_${suffix}`;
  const guestId = `test_guest_${suffix}`;
  await prisma.user.createMany({
    data: [
      { id: hostId, email: `${hostId}@example.test`, name: "Host", handle: hostId, plan: "party", ageVerified: true },
      { id: guestId, email: `${guestId}@example.test`, name: "Guest", handle: guestId, ageVerified: true },
    ],
  });
  try {
    const created = await createPartyDb(hostId, {
      name: "Test room", movieId: "free1", startsAt: null, isLive: true, syncMode: "watchify_free",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const inviteCode = created.value.inviteCode as string;
    const joined = await joinPartyByInviteDb(guestId, inviteCode);
    assert.equal("ok" in joined && joined.ok, true);
    assert.ok(await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId: created.value.id, userId: guestId } } }));
    await prisma.party.update({ where: { id: created.value.id }, data: { maxMembers: 2 } });
    const thirdId = `test_third_${suffix}`;
    await prisma.user.create({ data: { id: thirdId, email: `${thirdId}@example.test`, name: "Third", handle: thirdId } });
    const full = await joinPartyByInviteDb(thirdId, inviteCode);
    assert.match("error" in full ? full.error || "" : "", /full/i);
  } finally {
    await prisma.user.deleteMany({ where: { id: { startsWith: "test_" } } });
  }
});

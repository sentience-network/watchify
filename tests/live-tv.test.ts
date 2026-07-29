import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_TV_CHANNELS,
  getLiveChannel,
  isAllowlistedHlsUrl,
  isLiveChannelId,
  listLiveChannels,
} from "../src/lib/live-tv";
import { isFreePlayable } from "../src/lib/free-content";
import { getMovie, liveTvChannels } from "../src/lib/movies";

test("live TV catalog has free public channels only", () => {
  assert.ok(LIVE_TV_CHANNELS.length >= 8);
  for (const ch of LIVE_TV_CHANNELS) {
    assert.equal(ch.isLive, true);
    assert.equal(ch.licenseKind, "public_broadcast");
    assert.ok(ch.id.startsWith("live-"));
    assert.ok(ch.youtubePlaybackId || ch.hlsUrl || ch.freePlaybackUrl);
    assert.ok(ch.attribution?.sourceUrl);
    assert.equal(isFreePlayable(ch), true);
  }
});

test("live channel helpers and catalog lookup", () => {
  assert.equal(isLiveChannelId("live-nasa"), true);
  assert.equal(isLiveChannelId("free1"), false);
  const nasa = getLiveChannel("live-nasa");
  assert.ok(nasa);
  assert.equal(nasa?.youtubePlaybackId, "21X5lGlDOfg");
  assert.equal(getMovie("live-dw-en")?.title, "DW English");
  assert.equal(liveTvChannels().length, LIVE_TV_CHANNELS.length);
  assert.ok(listLiveChannels("news").every((c) => c.liveCategory === "news"));
  assert.ok(listLiveChannels("science").some((c) => c.id === "live-nasa"));
});

test("HLS allowlist rejects open proxy abuse", () => {
  assert.equal(
    isAllowlistedHlsUrl(
      "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8"
    ),
    true
  );
  assert.equal(
    isAllowlistedHlsUrl("https://live-hls-apps-aje.getaj.net/AJE/01.m3u8"),
    true
  );
  assert.equal(isAllowlistedHlsUrl("http://evil.example/x.m3u8"), false);
  assert.equal(isAllowlistedHlsUrl("https://evil.example/steal.m3u8"), false);
  assert.equal(isAllowlistedHlsUrl("not-a-url"), false);
});

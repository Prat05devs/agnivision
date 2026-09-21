import assert from "node:assert/strict";
import test from "node:test";

import notificationDispatch, { detectionWindowMs } from "../api/notification-dispatch";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/types/notification";

const INSTALLATION_ID = "11111111-2222-4333-8444-555555555555";

function deviceRecord(overrides: Record<string, unknown> = {}) {
  return {
    installationId: INSTALLATION_ID,
    secretHash: "ab".repeat(32),
    expoPushToken: null,
    platform: "ios",
    timezoneOffsetMinutes: -330,
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, masterEnabled: true },
    watches: [],
    locationPermission: "while-using",
    coarseLocation: { latitude: 30.32, longitude: 78.03, updatedAtUtc: new Date().toISOString() },
    updatedAtUtc: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Drives the real handler against an in-memory Redis stand-in. `storedDevice` is the
 * raw JSON the store would return, so a test can reproduce exactly what Redis holds.
 */
async function runDispatch(storedDeviceJson: string) {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.FIRMS_MAP_KEY = "test-firms-key";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "t";

  globalThis.fetch = (async (input: unknown, init: { body?: unknown } = {}) => {
    const url = String(typeof input === "string" ? input : (input as Request).url);
    if (url.includes("redis.invalid")) {
      const [operation, key] = JSON.parse(String(init.body)) as string[];
      if (operation === "SMEMBERS" && key!.endsWith(":devices")) {
        return new Response(JSON.stringify({ result: [INSTALLATION_ID] }));
      }
      if (operation === "GET" && key!.includes(":device:")) {
        return new Response(JSON.stringify({ result: storedDeviceJson }));
      }
      if (operation === "MGET") return new Response(JSON.stringify({ result: [] }));
      if (operation === "SET") return new Response(JSON.stringify({ result: "OK" }));
      return new Response(JSON.stringify({ result: null }));
    }
    if (url.includes("firms")) {
      return new Response(
        "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp\n30.33,78.04,2026-09-20,0830,N20,VIIRS,h,12.5",
      );
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;

  try {
    return await notificationDispatch.fetch(
      new Request("https://agnivision.live/api/notification-dispatch", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
}

test("a device with no destination watches does not abort the dispatch run", async () => {
  // Redis Lua has one table type, so a cjson decode/encode round trip rewrites an empty
  // array as `{}`. That is the default state of every freshly installed app, and it used
  // to make the whole run throw, delivering nothing to anybody.
  const response = await runDispatch(JSON.stringify(deviceRecord()).replace('"watches":[]', '"watches":{}'));
  assert.equal(response.status, 200, "a malformed watches value must not fail the run");

  const healthy = await runDispatch(JSON.stringify(deviceRecord()));
  assert.equal(healthy.status, 200);
});

test("the new-detection window spans the run gap plus FIRMS publication latency", () => {
  const now = Date.UTC(2026, 8, 20, 12, 0, 0);
  const minutes = (value: number) => value * 60 * 1000;
  const hours = (value: number) => minutes(value * 60);
  const latencyAndSlack = hours(6) + minutes(5);

  assert.equal(detectionWindowMs(now, null), latencyAndSlack, "first run still covers publication latency");
  assert.equal(detectionWindowMs(now, now - minutes(10)), minutes(10) + latencyAndSlack, "ten-minute cadence");
  assert.equal(detectionWindowMs(now, now - hours(24)), hours(24) + latencyAndSlack, "daily cadence is not clipped");
  assert.equal(detectionWindowMs(now, now - hours(96)), hours(36), "a long outage is capped, not replayed in full");
});

test("a detection as stale as real FIRMS data is still inside the window", () => {
  // The newest record in the live feed was ~3.4 hours old when fetched. The old fixed
  // 35-minute window rejected it, so no proximity or destination alert could ever fire.
  const now = Date.UTC(2026, 8, 20, 18, 1, 0);
  const newestLiveDetection = Date.UTC(2026, 8, 20, 14, 37, 0);
  const age = now - newestLiveDetection;

  assert.ok(age > 35 * 60 * 1000, "sanity: the old window would have rejected it");
  for (const lastRun of [null, now - 10 * 60 * 1000, now - 24 * 60 * 60 * 1000]) {
    assert.ok(age <= detectionWindowMs(now, lastRun), `accepted when lastRun=${lastRun}`);
  }
});

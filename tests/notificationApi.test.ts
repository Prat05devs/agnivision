import assert from "node:assert/strict";
import test from "node:test";

import notificationDevice from "../api/notification-device";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/types/notification";

test("device registration creates a protected record and rejects a different secret", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const values = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = async (_input, init) => {
    const [operation, key, ...args] = JSON.parse(String(init?.body)) as string[];
    let result: unknown = null;
    if (operation === "GET") {
      result = values.get(key!) ?? null;
    } else if (operation === "SET") {
      values.set(key!, args[0]!);
      result = "OK";
    } else if (operation === "SADD") {
      const members = sets.get(key!) ?? new Set<string>();
      members.add(args[0]!);
      sets.set(key!, members);
      result = 1;
    } else {
      throw new Error(`Unexpected Redis command in test: ${operation}`);
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  };

  const installationId = "11111111-2222-4333-8444-555555555555";
  const secret = "a".repeat(64);
  const body = {
    installationId,
    expoPushToken: "ExpoPushToken[test-device-token]",
    platform: "android",
    timezoneOffsetMinutes: -330,
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    watches: [],
    locationPermission: "while-using",
  };
  const request = (bearer: string) =>
    new Request("https://agnivision.live/api/notification-device", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agnivision-Installation": installationId,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
    });

  try {
    const registered = await notificationDevice.fetch(request(secret));
    assert.equal(registered.status, 200);
    assert.deepEqual(await registered.json(), { registered: true });
    assert.ok(values.has(`agnivision:notifications:device:${installationId}`));

    const unauthorized = await notificationDevice.fetch(request("b".repeat(64)));
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(await unauthorized.json(), { error: "Device authentication failed." });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import fireApi from "../api/fire-detections";
import placesApi from "../api/places";
import { createRateLimit } from "../api/_requestLimits";

test("100 concurrent satellite requests share one upstream refresh; failures cool down", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "synthetic-server-secret-never-return";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return new Response("latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp\n28.6139,77.2090,2026-09-06,0830,N20,VIIRS,n,8.4");
  };
  try {
    const requests = await Promise.all(Array.from({ length: 100 }, () => fireApi.fetch(new Request("https://api.invalid/api/fire-detections?days=3"))));
    assert.ok(requests.every((response) => response.status === 200));
    assert.equal(calls, 3);
    assert.ok(!(await requests[0]!.text()).includes(process.env.FIRMS_MAP_KEY));
    await fireApi.fetch(new Request("https://api.invalid/api/fire-detections?days=3"));
    assert.equal(calls, 3);
    globalThis.fetch = async () => { calls += 1; throw new Error(process.env.FIRMS_MAP_KEY); };
    const failures = await Promise.all(Array.from({ length: 100 }, () => fireApi.fetch(new Request("https://api.invalid/api/fire-detections?days=4"))));
    assert.ok(failures.every((response) => response.status === 502));
    assert.equal(calls, 6);
    const retry = await fireApi.fetch(new Request("https://api.invalid/api/fire-detections?days=4"));
    assert.equal(calls, 6);
    assert.ok(!(await retry.text()).includes(process.env.FIRMS_MAP_KEY));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FIRMS_MAP_KEY; else process.env.FIRMS_MAP_KEY = originalKey;
  }
});

test("Places errors cannot echo upstream credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "synthetic-sensitive-key";
  globalThis.fetch = async () => { throw new Error("Request failed: synthetic-sensitive-key"); };
  try {
    const response = await placesApi.fetch(new Request("https://api.invalid/api/places", { method: "POST", body: JSON.stringify({ input: "Delhi" }) }));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Destination search is temporarily unavailable." });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = originalKey;
  }
});

test("rate limiter is bounded and ignores spoofed forwarding headers", () => {
  const allow = createRateLimit(2, 1);
  assert.equal(allow(new Request("https://api.invalid", { headers: { "x-forwarded-for": "1.1.1.1" } })), true);
  assert.equal(allow(new Request("https://api.invalid", { headers: { "x-forwarded-for": "2.2.2.2" } })), true);
  assert.equal(allow(new Request("https://api.invalid", { headers: { "x-forwarded-for": "3.3.3.3" } })), false);
  assert.equal(allow(new Request("https://api.invalid", { headers: { "x-agnivision-client-ip": "new" } })), false);
});

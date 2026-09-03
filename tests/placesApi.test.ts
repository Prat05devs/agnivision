import assert from "node:assert/strict";
import test from "node:test";

import placesApi from "../api/places";

test("Places autocomplete is restricted to India and never returns the server key", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "server-only-test-key";
  let upstreamBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    upstreamBody = JSON.parse(String(init?.body));
    assert.equal(new Headers(init?.headers).get("X-Goog-Api-Key"), "server-only-test-key");
    return new Response(JSON.stringify({ suggestions: [{ placePrediction: { placeId: "ChIJ1234567890", text: { text: "Chopta, Uttarakhand, India" }, structuredFormat: { mainText: { text: "Chopta" }, secondaryText: { text: "Uttarakhand, India" } } } }] }), { status: 200 });
  };
  try {
    const response = await placesApi.fetch(new Request("https://agnivision.live/api/places", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" }, body: JSON.stringify({ input: "Chopta", sessionToken: "session-123" }) }));
    assert.equal(response.status, 200);
    assert.deepEqual((upstreamBody as unknown as { includedRegionCodes: string[] }).includedRegionCodes, ["in"]);
    const text = await response.text();
    assert.doesNotMatch(text, /server-only-test-key/);
    assert.match(text, /Chopta/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalKey;
  }
});

test("Place details outside the India data scope are rejected", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "server-only-test-key";
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "ChIJ1234567890", displayName: { text: "Paris" }, formattedAddress: "Paris, France", location: { latitude: 48.8566, longitude: 2.3522 } }), { status: 200 });
  try {
    const response = await placesApi.fetch(new Request("https://agnivision.live/api/places", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.11" }, body: JSON.stringify({ placeId: "ChIJ1234567890" }) }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "AgniVision.live destination search is limited to India." });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = originalKey;
  }
});

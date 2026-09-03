import assert from "node:assert/strict";
import test from "node:test";

import detectionAreasApi from "../api/detection-areas";
import {
  detectionAreaCellKey,
  detectionAreaFromAddressComponents,
} from "../src/utils/detectionArea";

test("reverse-geocoded components prefer a local area with city and state context", () => {
  const area = detectionAreaFromAddressComponents([
    { long_name: "Malsi", types: ["neighborhood"] },
    { long_name: "Dehradun", types: ["locality"] },
    { long_name: "Dehradun District", types: ["administrative_area_level_2"] },
    { long_name: "Uttarakhand", types: ["administrative_area_level_1"] },
  ]);

  assert.deepEqual(area, {
    area: "Malsi",
    city: "Dehradun",
    district: "Dehradun District",
    state: "Uttarakhand",
    label: "Near Malsi, Dehradun, Uttarakhand",
  });
});

test("nearby observations share an approximate locality cell", () => {
  assert.equal(
    detectionAreaCellKey({ latitude: 30.3165, longitude: 78.0322 }),
    detectionAreaCellKey({ latitude: 30.317, longitude: 78.031 }),
  );
});

test("area endpoint coalesces nearby coordinates and never returns the server key", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_GEOCODING_API_KEY;
  process.env.GOOGLE_GEOCODING_API_KEY = "server-only-geocoding-key";
  let upstreamCalls = 0;
  globalThis.fetch = async (input) => {
    upstreamCalls += 1;
    assert.match(String(input), /maps\.googleapis\.com\/maps\/api\/geocode\/json/);
    return new Response(JSON.stringify({
      status: "OK",
      results: [{
        address_components: [
          { long_name: "Malsi", types: ["neighborhood"] },
          { long_name: "Dehradun", types: ["locality"] },
          { long_name: "Uttarakhand", types: ["administrative_area_level_1"] },
        ],
      }],
    }), { status: 200 });
  };

  try {
    const response = await detectionAreasApi.fetch(new Request("https://agnivision.live/api/detection-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.30" },
      body: JSON.stringify({ points: [
        { latitude: 30.3165, longitude: 78.0322 },
        { latitude: 30.317, longitude: 78.031 },
      ] }),
    }));
    assert.equal(response.status, 200);
    assert.equal(upstreamCalls, 1);
    const text = await response.text();
    assert.match(text, /Near Malsi, Dehradun, Uttarakhand/);
    assert.doesNotMatch(text, /server-only-geocoding-key/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_GEOCODING_API_KEY;
    else process.env.GOOGLE_GEOCODING_API_KEY = originalKey;
  }
});

test("area endpoint rejects coordinates outside India before geocoding", async () => {
  const originalKey = process.env.GOOGLE_GEOCODING_API_KEY;
  process.env.GOOGLE_GEOCODING_API_KEY = "server-only-geocoding-key";
  try {
    const response = await detectionAreasApi.fetch(new Request("https://agnivision.live/api/detection-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.31" },
      body: JSON.stringify({ points: [{ latitude: 48.8566, longitude: 2.3522 }] }),
    }));
    assert.equal(response.status, 400);
  } finally {
    if (originalKey === undefined) delete process.env.GOOGLE_GEOCODING_API_KEY;
    else process.env.GOOGLE_GEOCODING_API_KEY = originalKey;
  }
});

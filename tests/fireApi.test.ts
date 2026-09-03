import assert from "node:assert/strict";
import test from "node:test";

import { getDetections } from "../api/fire-detections";

test("FIRMS normalization drops neighboring-country rows returned by the India envelope", async () => {
  const originalFetch = globalThis.fetch;
  const csv = [
    "latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp",
    "28.6139,77.2090,2026-09-02,0830,N20,VIIRS,n,8.4",
    "23.8103,90.4125,2026-09-02,0835,N20,VIIRS,h,18.2",
  ].join("\n");
  globalThis.fetch = async () => new Response(csv, { status: 200 });

  try {
    const result = await getDetections("test-key", 1);
    assert.equal(result.detections.length, 3, "one Delhi row is retained for each configured sensor source");
    assert.ok(result.detections.every((detection) => detection.latitude === 28.6139 && detection.longitude === 77.209));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

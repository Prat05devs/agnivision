import assert from "node:assert/strict";
import test from "node:test";

import {
  createWatchedDestination,
  isQuietTime,
  matchingDetections,
  mayInterruptDuringQuietHours,
} from "../src/notifications/rules";
import type { FireDetection } from "../src/types/fire";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/types/notification";

function detection(id: string, latitude: number, confidence: "low" | "nominal" | "high"): FireDetection {
  return {
    id,
    source: "NASA_FIRMS",
    sensor: "VIIRS_NOAA20_NRT",
    latitude,
    longitude: 78.0322,
    acquiredAtUtc: "2026-09-02T06:00:00.000Z",
    satellite: "NOAA-20",
    instrument: "VIIRS",
    confidence: { raw: confidence[0]!, class: confidence },
    intensityLevel: confidence === "high" ? 3 : confidence === "nominal" ? 2 : 1,
    fetchedAtUtc: "2026-09-02T06:10:00.000Z",
  };
}

test("notification matching applies radius and confidence preferences", () => {
  const matches = matchingDetections(
    [detection("low", 30.32, "low"), detection("nominal", 30.34, "nominal"), detection("far", 31.5, "high")],
    { latitude: 30.3165, longitude: 78.0322 },
    10,
    "nominal",
  );
  assert.deepEqual(matches.map(({ detection: item }) => item.id), ["nominal"]);
});

test("quiet hours span midnight and only High can use the configured override", () => {
  assert.equal(isQuietTime(DEFAULT_NOTIFICATION_PREFERENCES, new Date("2026-09-02T23:00:00.000Z")), true);
  assert.equal(isQuietTime(DEFAULT_NOTIFICATION_PREFERENCES, new Date("2026-09-02T06:00:00.000Z")), true);
  assert.equal(isQuietTime(DEFAULT_NOTIFICATION_PREFERENCES, new Date("2026-09-02T12:00:00.000Z")), false);
  assert.equal(mayInterruptDuringQuietHours("high", DEFAULT_NOTIFICATION_PREFERENCES), true);
  assert.equal(mayInterruptDuringQuietHours("nominal", DEFAULT_NOTIFICATION_PREFERENCES), false);
});

test("destination watches default to the planned 25 km radius", () => {
  const watch = createWatchedDestination({
    id: "chopta",
    name: "Chopta",
    region: "Uttarakhand",
    coordinate: { latitude: 30.48, longitude: 79.16 },
  });
  assert.equal(watch.radiusKm, 25);
  assert.equal(watch.name, "Chopta");
});

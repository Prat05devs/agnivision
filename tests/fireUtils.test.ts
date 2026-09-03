import assert from "node:assert/strict";
import test from "node:test";

import {
  filterDetectionsByTime,
  formatDistanceKm,
  getDetectionRegionLabel,
  haversineDistanceKm,
} from "../src/utils/fire";
import { makeFireDetection } from "./fixtures/fireDetection";

const NOW = Date.parse("2026-09-01T15:00:00.000Z");

test("time filters enforce 24-hour and three-day windows", () => {
  const detections = [
    makeFireDetection({ id: "recent", acquiredAtUtc: "2026-09-01T12:00:00.000Z" }),
    makeFireDetection({ id: "two-days", acquiredAtUtc: "2026-08-30T12:00:00.000Z" }),
    makeFireDetection({ id: "old", acquiredAtUtc: "2026-08-20T12:00:00.000Z" }),
  ];

  assert.deepEqual(filterDetectionsByTime(detections, "24h", NOW).map(({ id }) => id), ["recent"]);
  assert.deepEqual(filterDetectionsByTime(detections, "3d", NOW).map(({ id }) => id), [
    "recent",
    "two-days",
  ]);
  assert.deepEqual(filterDetectionsByTime(detections, "5d", NOW).map(({ id }) => id), [
    "recent",
    "two-days",
  ]);
});

test("nearby-place labels include distance, direction, city, and state", () => {
  const label = getDetectionRegionLabel(makeFireDetection());

  assert.match(label, /^\d+ km (N|NE|E|SE|S|SW|W|NW) of Nellore, Andhra Pradesh$/);
});

test("distance helpers remain stable for known coordinates", () => {
  const distance = haversineDistanceKm(
    { latitude: 28.6139, longitude: 77.209 },
    { latitude: 30.3165, longitude: 78.0322 },
  );

  assert.ok(distance > 200 && distance < 220);
  assert.equal(formatDistanceKm(7.25), "7.3 km");
  assert.equal(formatDistanceKm(208.6), "209 km");
});

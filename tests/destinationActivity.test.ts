import assert from "node:assert/strict";
import test from "node:test";

import { featuredDestinations } from "../src/data/destinations";
import type { Destination } from "../src/types/destination";
import {
  DESTINATION_ACTIVITY_LOOKBACK_DAYS,
  DESTINATION_ACTIVITY_RADIUS_KM,
  getNearbyDestinationDetections,
} from "../src/utils/destinationActivity";
import { makeFireDetection } from "./fixtures/fireDetection";

const NOW = Date.parse("2026-09-01T15:00:00.000Z");
const destination: Destination = {
  id: "test-place",
  name: "Test Place",
  region: "Test State",
  coordinate: { latitude: 20, longitude: 80 },
};

test("destination activity is limited to 50 km and five days", () => {
  const results = getNearbyDestinationDetections(
    [
      makeFireDetection({ id: "near", latitude: 20.1, longitude: 80, acquiredAtUtc: "2026-09-01T12:00:00.000Z" }),
      makeFireDetection({ id: "outside-radius", latitude: 20.6, longitude: 80, acquiredAtUtc: "2026-09-01T13:00:00.000Z" }),
      makeFireDetection({ id: "expired", latitude: 20.05, longitude: 80, acquiredAtUtc: "2026-08-27T14:59:59.000Z" }),
      makeFireDetection({ id: "future", latitude: 20.05, longitude: 80, acquiredAtUtc: "2026-09-01T15:01:00.000Z" }),
    ],
    destination,
    NOW,
  );

  assert.equal(DESTINATION_ACTIVITY_RADIUS_KM, 50);
  assert.equal(DESTINATION_ACTIVITY_LOOKBACK_DAYS, 5);
  assert.deepEqual(results.map(({ detection }) => detection.id), ["near"]);
});

test("destination activity is ordered newest first", () => {
  const results = getNearbyDestinationDetections(
    [
      makeFireDetection({ id: "older", latitude: 20.1, longitude: 80, acquiredAtUtc: "2026-08-31T12:00:00.000Z" }),
      makeFireDetection({ id: "newer", latitude: 20.2, longitude: 80, acquiredAtUtc: "2026-09-01T12:00:00.000Z" }),
    ],
    destination,
    NOW,
  );

  assert.deepEqual(results.map(({ detection }) => detection.id), ["newer", "older"]);
});

test("curated destinations include one option for every Indian state", () => {
  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  ];
  const regions = new Set(featuredDestinations.map(({ region }) => region));
  const ids = featuredDestinations.map(({ id }) => id);

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(states.filter((state) => !regions.has(state)), []);
  assert.ok(featuredDestinations.some(({ name }) => name === "Shimla"));
  assert.ok(featuredDestinations.some(({ name }) => name === "Gangtok"));
});

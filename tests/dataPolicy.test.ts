import assert from "node:assert/strict";
import test from "node:test";

import {
  applyObservationRetentionPolicy,
  MAX_RETAINED_OBSERVATIONS,
  OBSERVATION_RETENTION_DAYS,
} from "../src/config/dataPolicy";
import { makeFireDetection } from "./fixtures/fireDetection";

const NOW = Date.parse("2026-09-01T15:00:00.000Z");

test("retention removes observations older than five days", () => {
  const retained = applyObservationRetentionPolicy(
    [
      makeFireDetection({ id: "recent", acquiredAtUtc: "2026-08-31T15:00:00.000Z" }),
      makeFireDetection({ id: "expired", acquiredAtUtc: "2026-08-26T14:59:59.000Z" }),
    ],
    NOW,
  );

  assert.equal(OBSERVATION_RETENTION_DAYS, 5);
  assert.deepEqual(retained.map((detection) => detection.id), ["recent"]);
});

test("retention removes invalid timestamps and duplicate ids", () => {
  const retained = applyObservationRetentionPolicy(
    [
      makeFireDetection({ id: "same", acquiredAtUtc: "2026-09-01T11:00:00.000Z", frpMw: 2 }),
      makeFireDetection({ id: "same", acquiredAtUtc: "2026-09-01T12:00:00.000Z", frpMw: 8 }),
      makeFireDetection({ id: "invalid", acquiredAtUtc: "not-a-date" }),
    ],
    NOW,
  );

  assert.equal(retained.length, 1);
  assert.equal(retained[0]?.id, "same");
  assert.equal(retained[0]?.frpMw, 8);
});

test("retention sorts newest first and enforces the record cap", () => {
  const detections = Array.from({ length: MAX_RETAINED_OBSERVATIONS + 25 }, (_, index) =>
    makeFireDetection({
      id: `detection-${index}`,
      acquiredAtUtc: new Date(NOW - index * 1000).toISOString(),
    }),
  ).reverse();

  const retained = applyObservationRetentionPolicy(detections, NOW);

  assert.equal(retained.length, MAX_RETAINED_OBSERVATIONS);
  assert.equal(retained[0]?.id, "detection-0");
  assert.equal(retained.at(-1)?.id, `detection-${MAX_RETAINED_OBSERVATIONS - 1}`);
});

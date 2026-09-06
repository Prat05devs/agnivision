import assert from "node:assert/strict";
import test from "node:test";

import type { OfficialAdvisory } from "../src/types/advisory";
import { isAdvisoryForUttarakhand, isCoordinateInUttarakhand } from "../src/utils/uttarakhand";

function advisory(overrides: Partial<OfficialAdvisory>): OfficialAdvisory {
  return {
    id: "advisory-1",
    event: "Weather alert",
    category: "Met",
    severity: "moderate",
    headline: "Heavy rain is likely",
    issuedAt: "2026-09-06T04:00:00.000Z",
    source: "NDMA_SACHET",
    sourceIdentifier: "source-1",
    ...overrides,
  };
}

test("Uttarakhand boundary includes locations across the state and excludes nearby cities", () => {
  assert.equal(isCoordinateInUttarakhand({ latitude: 30.3165, longitude: 78.0322 }), true);
  assert.equal(isCoordinateInUttarakhand({ latitude: 29.3803, longitude: 79.4636 }), true);
  assert.equal(isCoordinateInUttarakhand({ latitude: 30.7268, longitude: 79.6053 }), true);
  assert.equal(isCoordinateInUttarakhand({ latitude: 28.6139, longitude: 77.209 }), false);
  assert.equal(isCoordinateInUttarakhand({ latitude: 31.1048, longitude: 77.1734 }), false);
});

test("Uttarakhand advisories match state text, the former state name, or coordinates", () => {
  assert.equal(isAdvisoryForUttarakhand(advisory({ state: "Uttarakhand" })), true);
  assert.equal(isAdvisoryForUttarakhand(advisory({ areaDescription: "Districts of Uttaranchal" })), true);
  assert.equal(isAdvisoryForUttarakhand(advisory({ latitude: 30.3165, longitude: 78.0322 })), true);
  assert.equal(isAdvisoryForUttarakhand(advisory({ state: "Tamil Nadu" })), false);
});

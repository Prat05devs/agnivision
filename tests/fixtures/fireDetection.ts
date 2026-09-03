import type { FireDetection } from "../../src/types/fire";

export function makeFireDetection(overrides: Partial<FireDetection> = {}): FireDetection {
  return {
    id: "detection-1",
    source: "NASA_FIRMS",
    sensor: "VIIRS_NOAA20_NRT",
    latitude: 14.593,
    longitude: 79.739,
    acquiredAtUtc: "2026-09-01T12:00:00.000Z",
    satellite: "NOAA-20",
    instrument: "VIIRS",
    confidence: { raw: "n", class: "nominal" },
    intensityLevel: 2,
    fetchedAtUtc: "2026-09-01T13:00:00.000Z",
    ...overrides,
  };
}

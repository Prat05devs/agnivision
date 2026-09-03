import assert from "node:assert/strict";
import test from "node:test";

import {
  buildThermalHeatmapPoints,
  THERMAL_HEATMAP_GRADIENT,
} from "../src/map/thermalHeatmap";
import { makeFireDetection } from "./fixtures/fireDetection";

test("the thermal ramp reaches warm colors before reserving red for density peaks", () => {
  assert.deepEqual(THERMAL_HEATMAP_GRADIENT.colors.slice(-3), ["#F2DC45", "#FF8A20", "#D92D20"]);
  assert.ok(THERMAL_HEATMAP_GRADIENT.startPoints[3]! < 0.2);
  assert.equal(THERMAL_HEATMAP_GRADIENT.startPoints.at(-1), 1);
});

test("every filtered observation contributes equally to density regardless of age or confidence", () => {
  const points = buildThermalHeatmapPoints([
    makeFireDetection({ id: "recent-low", confidence: { raw: "l", class: "low" }, intensityLevel: 1 }),
    makeFireDetection({ id: "older-high", acquiredAtUtc: "2026-08-28T12:00:00.000Z", confidence: { raw: "h", class: "high" }, intensityLevel: 3 }),
  ]);

  assert.equal(points.length, 2);
  assert.deepEqual(points.map((point) => point.weight), [1, 1]);
});

test("the heat surface rejects neighboring-country observations", () => {
  const points = buildThermalHeatmapPoints([
    makeFireDetection({ id: "india", latitude: 14.593, longitude: 79.739 }),
    makeFireDetection({ id: "sri-lanka", latitude: 7.8731, longitude: 80.7718 }),
    makeFireDetection({ id: "bangladesh", latitude: 23.81, longitude: 90.41 }),
  ]);

  assert.deepEqual(points.map((point) => point.latitude), [14.593]);
});

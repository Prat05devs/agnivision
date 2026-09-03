import assert from "node:assert/strict";
import test from "node:test";

import { clusterDetections, isCoordinateInIndiaScope, zoomFromLongitudeDelta } from "../src/map/clustering";
import { intensityLevelForConfidence } from "../src/utils/intensity";
import { makeFireDetection } from "./fixtures/fireDetection";

test("FIRMS confidence classes map directly to the three intensity levels regardless of FRP", () => {
  const observedFirmsExamples = [
    { raw: "l", class: "low" as const, frpMw: 37.4, expected: 1 },
    { raw: "n", class: "nominal" as const, frpMw: 3.1, expected: 2 },
    { raw: "h", class: "high" as const, frpMw: 6.8, expected: 3 },
    { raw: 12, class: "low" as const, frpMw: 90, expected: 1 },
    { raw: 56, class: "nominal" as const, frpMw: 2, expected: 2 },
    { raw: 91, class: "high" as const, frpMw: 1, expected: 3 },
  ];
  observedFirmsExamples.forEach((example) => {
    assert.equal(intensityLevelForConfidence(example.class), example.expected, JSON.stringify(example));
  });
});

test("an India-level cluster keeps the highest member intensity and exact detection count", () => {
  const nodes = clusterDetections(
    [
      makeFireDetection({ id: "low", latitude: 30.31, longitude: 78.03, confidence: { raw: "l", class: "low" }, intensityLevel: 1 }),
      makeFireDetection({ id: "high", latitude: 30.42, longitude: 78.12, confidence: { raw: "h", class: "high" }, intensityLevel: 3 }),
      makeFireDetection({ id: "nominal", latitude: 30.5, longitude: 78.2, confidence: { raw: "n", class: "nominal" }, intensityLevel: 2 }),
    ],
    { latitude: 22.97, longitude: 78.65, latitudeDelta: 25, longitudeDelta: 25 },
  );
  const cluster = nodes.find((node) => node.kind === "cluster");
  assert.ok(cluster && cluster.kind === "cluster");
  assert.equal(cluster.cluster.count, 3);
  assert.equal(cluster.cluster.intensityLevel, 3);
  assert.deepEqual(new Set(cluster.cluster.memberIds), new Set(["low", "high", "nominal"]));
});

test("city zoom reveals sparse individual detections and rejects data outside India or the viewport", () => {
  const nodes = clusterDetections(
    [
      makeFireDetection({ id: "near", latitude: 30.31, longitude: 78.03 }),
      makeFireDetection({ id: "outside", latitude: 19.07, longitude: 72.88 }),
      makeFireDetection({ id: "outside-india", latitude: 30.31, longitude: 55 }),
    ],
    { latitude: 30.31, longitude: 78.03, latitudeDelta: 0.3, longitudeDelta: 0.3 },
  );
  assert.deepEqual(nodes.map((node) => node.kind === "detection" ? node.detection.id : node.cluster.id), ["near"]);
  assert.ok(zoomFromLongitudeDelta(0.3) >= 10);
});

test("India scope rejects neighboring-country coordinates inside the broad envelope and retains islands", () => {
  assert.equal(isCoordinateInIndiaScope({ latitude: 23.81, longitude: 90.41 }), false, "Dhaka must not enter the India feed");
  assert.equal(isCoordinateInIndiaScope({ latitude: 27.72, longitude: 85.32 }), false, "Kathmandu must not enter the India feed");
  assert.equal(isCoordinateInIndiaScope({ latitude: 11.67, longitude: 92.76 }), true, "Andaman detections remain eligible");
  assert.equal(isCoordinateInIndiaScope({ latitude: 10.57, longitude: 72.64 }), true, "Lakshadweep detections remain eligible");
});

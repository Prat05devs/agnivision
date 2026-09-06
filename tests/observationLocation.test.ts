import assert from "node:assert/strict";
import test from "node:test";

import {
  formatObservationCoordinates,
  getObservationLocationShareMessage,
  getObservationMapUrl,
} from "../src/utils/observationLocation";

const coordinate = { latitude: 14.593, longitude: 79.739 };

test("observation locations use stable map coordinates", () => {
  assert.equal(formatObservationCoordinates(coordinate), "14.59300, 79.73900");
  assert.equal(
    getObservationMapUrl(coordinate),
    "https://www.google.com/maps/search/?api=1&query=14.59300%2C79.73900",
  );
});

test("location shares include context, coordinates, a map link, and a safety qualifier", () => {
  const message = getObservationLocationShareMessage(coordinate, "Nellore, Andhra Pradesh");

  assert.match(message, /Nellore, Andhra Pradesh/);
  assert.match(message, /Coordinates: 14\.59300, 79\.73900/);
  assert.match(message, /https:\/\/www\.google\.com\/maps\/search/);
  assert.match(message, /not a confirmed ground fire/);
});

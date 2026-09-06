import assert from "node:assert/strict";
import test from "node:test";

import destinationImages from "../src/data/destinationImages.json";
import { featuredDestinations } from "../src/data/destinations";

test("destination gallery only contains curated HTTPS images with no-attribution licenses", () => {
  const destinationIds = new Set(featuredDestinations.map((destination) => destination.id));

  for (const [destinationId, images] of Object.entries(destinationImages)) {
    assert.equal(destinationIds.has(destinationId), true);
    for (const image of images) {
      assert.match(image.uri, /^https:\/\//);
      assert.match(image.sourcePage, /^https:\/\/commons\.wikimedia\.org\//);
      assert.match(image.license.toLowerCase(), /^(cc0|public domain|pdm)$/);
    }
  }
});

test("the featured Uttarakhand destination has a swipeable image set", () => {
  assert.ok(destinationImages.rishikesh.length >= 2);
});

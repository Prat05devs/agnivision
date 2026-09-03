import assert from "node:assert/strict";
import test from "node:test";

import { formatLocationLabel } from "../src/utils/location";

test("location labels combine a precise place, locality, city, and state", () => {
  assert.equal(
    formatLocationLabel({
      name: "Pacific Mall",
      district: "Jakhan",
      city: "Dehradun",
      subregion: "Dehradun",
      region: "Uttarakhand",
    }),
    "Pacific Mall, Jakhan, Dehradun, Uttarakhand",
  );
});

test("location labels remove duplicate administrative names", () => {
  assert.equal(
    formatLocationLabel({ city: "Dehradun", subregion: "Dehradun", region: "Uttarakhand" }),
    "Dehradun, Uttarakhand",
  );
});

test("location labels fall back to a street when the placemark name is only a number", () => {
  assert.equal(
    formatLocationLabel({ name: "42", street: "Rajpur Road", city: "Dehradun", region: "Uttarakhand" }),
    "Rajpur Road, Dehradun, Uttarakhand",
  );
});

test("location labels return null when no readable address is available", () => {
  assert.equal(formatLocationLabel({}), null);
  assert.equal(formatLocationLabel(null), null);
});

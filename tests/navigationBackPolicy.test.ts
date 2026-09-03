import assert from "node:assert/strict";
import test from "node:test";

import { getMainBackAction } from "../src/navigation/backPolicy";

test("Android back closes a selected map observation before leaving the tab", () => {
  assert.equal(getMainBackAction("map", true), "close-map-selection");
});

test("Android back uses the same close action for a selected destination", () => {
  assert.equal(getMainBackAction("map", true), "close-map-selection");
});

test("Android back returns non-home root tabs to Home", () => {
  assert.equal(getMainBackAction("map", false), "go-home");
  assert.equal(getMainBackAction("activity", false), "go-home");
  assert.equal(getMainBackAction("info", false), "go-home");
});

test("only an unstacked Home screen permits the operating system to exit", () => {
  assert.equal(getMainBackAction("home", false), "exit-app");
});

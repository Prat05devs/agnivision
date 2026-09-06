import assert from "node:assert/strict";
import test from "node:test";

import notificationDispatch from "../api/notification-dispatch";
import detectionAreasApi from "../api/detection-areas";
import placesApi from "../api/places";

test("API preflight responses use an empty 204 response", async () => {
  for (const endpoint of [placesApi, detectionAreasApi]) {
    const response = await endpoint.fetch(new Request("https://agnivision.live/api/test", { method: "OPTIONS" }));
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  }
});

test("notification dispatch fails closed without a cron secret", async () => {
  const originalSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const response = await notificationDispatch.fetch(new Request("https://agnivision.live/api/notification-dispatch"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Notification dispatch is not configured." });
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});

test("notification dispatch rejects an invalid cron credential before backend work", async () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  try {
    const response = await notificationDispatch.fetch(new Request("https://agnivision.live/api/notification-dispatch", {
      headers: { Authorization: "Bearer incorrect" },
    }));
    assert.equal(response.status, 401);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});

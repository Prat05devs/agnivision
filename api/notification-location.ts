import type { Coordinate } from "../src/types/fire";
import { authenticateDevice, isResponse, json } from "./_notificationHttp";
import { saveDevice } from "./_notificationStore";

function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== "object") return false;
  const coordinate = value as Coordinate;
  return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude) && Math.abs(coordinate.latitude) <= 90 && Math.abs(coordinate.longitude) <= 180;
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "POST" && request.method !== "DELETE") return json({ error: "Method not allowed." }, 405);
    try {
      const device = await authenticateDevice(request);
      if (isResponse(device)) return device;
      if (request.method === "DELETE") {
        await saveDevice({ ...device, coarseLocation: null, updatedAtUtc: new Date().toISOString() });
        return json({ cleared: true });
      }
      const body = (await request.json()) as { coordinate?: unknown; areaLabel?: unknown };
      if (!isCoordinate(body.coordinate)) return json({ error: "A valid coarse coordinate is required." }, 400);
      const areaLabel = typeof body.areaLabel === "string" && body.areaLabel.trim().length <= 160 ? body.areaLabel.trim() : device.coarseLocation?.areaLabel;
      await saveDevice({ ...device, coarseLocation: { ...body.coordinate, ...(areaLabel ? { areaLabel } : {}), updatedAtUtc: new Date().toISOString() }, updatedAtUtc: new Date().toISOString() });
      return json({ updated: true });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Location update failed." }, 503);
    }
  },
};

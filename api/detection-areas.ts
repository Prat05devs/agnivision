import { isCoordinateInIndiaScope } from "../src/map/clustering";
import type { Coordinate } from "../src/types/fire";
import { createRateLimit } from "./_requestLimits";
import {
  detectionAreaCellKey,
  detectionAreaFromAddressComponents,
  type AddressComponent,
  type DetectionArea,
} from "../src/utils/detectionArea";

type CachedArea = { area: DetectionArea | null; expiresAt: number };

const MAX_POINTS = 12;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const areaCache = new Map<string, CachedArea>();
const consumeRateLimit = createRateLimit(60);
const pendingAreas = new Map<string, Promise<void>>();

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Coordinate>;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    point.latitude! >= -90 && point.latitude! <= 90 && point.longitude! >= -180 && point.longitude! <= 180;
}

async function reverseGeocode(coordinate: Coordinate, key: string): Promise<DetectionArea | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${coordinate.latitude},${coordinate.longitude}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("region", "in");
  url.searchParams.set("key", key);

  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Area lookup returned HTTP ${response.status}.`);

  const payload = await response.json() as {
    status?: string;
    error_message?: string;
    results?: Array<{ address_components?: AddressComponent[] }>;
  };
  if (payload.status === "ZERO_RESULTS") return null;
  if (payload.status !== "OK") throw new Error(payload.error_message ?? "Area lookup was unavailable.");

  for (const result of payload.results ?? []) {
    const area = detectionAreaFromAddressComponents(result.address_components ?? []);
    if (area) return area;
  }
  return null;
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const geocodingKey = process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
    if (!geocodingKey) return json({ error: "Area names are not configured." }, 503);

    try {
      const body = await request.json() as { points?: unknown };
      if (!body || !Array.isArray(body.points) || body.points.length === 0 || body.points.length > MAX_POINTS) {
        return json({ error: `Provide 1–${MAX_POINTS} coordinates.` }, 400);
      }

      if (!body.points.every(isCoordinate)) {
        return json({ error: "Area lookup is limited to valid coordinates in India." }, 400);
      }
      const coordinates = body.points;
      if (!coordinates.every(isCoordinateInIndiaScope)) return json({ error: "Area lookup is limited to valid coordinates in India." }, 400);

      const uniqueByCell = new Map<string, Coordinate>();
      for (const coordinate of coordinates) {
        uniqueByCell.set(detectionAreaCellKey(coordinate), coordinate);
      }

      const now = Date.now();
      const missing = [...uniqueByCell.entries()].filter(([cell]) => {
        const cached = areaCache.get(cell);
        return !cached || cached.expiresAt <= now;
      });
      if (!consumeRateLimit(request, missing.length)) {
        return json({ error: "Too many area lookups. Please wait a moment." }, 429);
      }

      await Promise.all(missing.map(([cell, coordinate]) => {
        const pending = pendingAreas.get(cell);
        if (pending) return pending;
        if (pendingAreas.size >= 24) throw new Error("Area service is busy.");
        const lookup = reverseGeocode(coordinate, geocodingKey).then((area) => {
          if (areaCache.size >= 10_000) areaCache.delete(areaCache.keys().next().value!);
          areaCache.set(cell, { area, expiresAt: Date.now() + CACHE_TTL_MS });
        }).finally(() => pendingAreas.delete(cell));
        pendingAreas.set(cell, lookup);
        return lookup;
      }));

      const areas = [...uniqueByCell.keys()].flatMap((cell) => {
        const area = areaCache.get(cell)?.area;
        return area ? [{ cell, ...area }] : [];
      });
      return json({ areas });
    } catch {
      return json({ error: "Area lookup failed." }, 502);
    }
  },
};

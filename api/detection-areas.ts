import { isCoordinateInIndiaScope } from "../src/map/clustering";
import type { Coordinate } from "../src/types/fire";
import {
  detectionAreaCellKey,
  detectionAreaFromAddressComponents,
  type AddressComponent,
  type DetectionArea,
} from "../src/utils/detectionArea";

type CachedArea = { area: DetectionArea | null; expiresAt: number };
type RateBucket = { count: number; resetAt: number };

const MAX_POINTS = 12;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const areaCache = new Map<string, CachedArea>();
const rateBuckets = new Map<string, RateBucket>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function consumeRateLimit(request: Request, count: number) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const current = rateBuckets.get(client);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(client, { count, resetAt: now + 60_000 });
    return count <= 60;
  }
  current.count += count;
  return current.count <= 60;
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

  const response = await fetch(url, { headers: { Accept: "application/json" } });
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
      if (!Array.isArray(body.points) || body.points.length === 0 || body.points.length > MAX_POINTS) {
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

      await Promise.all(missing.map(async ([cell, coordinate]) => {
        const area = await reverseGeocode(coordinate, geocodingKey);
        areaCache.set(cell, { area, expiresAt: now + CACHE_TTL_MS });
      }));

      const areas = [...uniqueByCell.keys()].flatMap((cell) => {
        const area = areaCache.get(cell)?.area;
        return area ? [{ cell, ...area }] : [];
      });
      return json({ areas });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Area lookup failed." }, 502);
    }
  },
};

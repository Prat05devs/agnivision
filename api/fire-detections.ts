import type { ConfidenceClass, FireDetection, FireSensor } from "../src/types/fire";
import { intensityLevelForConfidence } from "../src/utils/intensity";
import { isCoordinateInIndiaScope } from "../src/map/clustering";

const FIRMS_AREA_API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const INDIA_BOUNDING_BOX = "68.1,6.5,97.5,37.6";
const CACHE_TTL_MS = 10 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 12 * 1000;
const SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"] as const satisfies readonly FireSensor[];
type UpstreamSource = (typeof SOURCES)[number];

type CacheEntry = {
  response: FireDetectionsPayload;
  expiresAt: number;
};

export type FireDetectionsPayload = {
  detections: FireDetection[];
  fetchedAtUtc: string;
  sourceStatus: Array<{
    source: FireSensor;
    status: "ready" | "unavailable";
    detectionCount?: number;
  }>;
  isStale?: boolean;
};

type CsvRow = Record<string, string>;

const cache = new Map<number, CacheEntry>();

function json(body: unknown, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseDayRange(request: Request) {
  const rawValue = new URL(request.url).searchParams.get("days") ?? "1";
  if (!/^[1-5]$/.test(rawValue)) {
    return null;
  }

  return Number(rawValue);
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);

    if (character === '"') {
      if (quoted && text.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\n" && !quoted) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (character !== "\r") {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "").trim()) ?? [];
  if (headers.length === 0) {
    return [];
  }

  return rows
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])),
    );
}

function getNumber(row: CsvRow, key: string) {
  const rawValue = row[key]?.trim();
  if (!rawValue) {
    return undefined;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function getAcquiredAtUtc(row: CsvRow) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.acq_date ?? "");
  const time = (row.acq_time ?? "").padStart(4, "0");
  const timeMatch = /^(\d{2})(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
}

function getModisConfidenceClass(value: number): ConfidenceClass {
  if (value < 30) {
    return "low";
  }

  return value < 80 ? "nominal" : "high";
}

function getViirsConfidenceClass(value: string): ConfidenceClass | undefined {
  switch (value.trim().toLowerCase()) {
    case "l":
    case "low":
      return "low";
    case "n":
    case "nominal":
      return "nominal";
    case "h":
    case "high":
      return "high";
    default:
      return undefined;
  }
}

function getConfidence(row: CsvRow, source: UpstreamSource): FireDetection["confidence"] {
  const rawValue = row.confidence?.trim();
  if (!rawValue) {
    return null;
  }

  if (source === "MODIS_NRT") {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return { raw: rawValue };
    }

    return { raw: numericValue, class: getModisConfidenceClass(numericValue) };
  }

  return { raw: rawValue, class: getViirsConfidenceClass(rawValue) };
}

function normalizeRow(row: CsvRow, source: UpstreamSource, fetchedAtUtc: string): FireDetection | null {
  const latitude = getNumber(row, "latitude");
  const longitude = getNumber(row, "longitude");
  const acquiredAtUtc = getAcquiredAtUtc(row);
  const satellite = row.satellite?.trim();
  const instrument = row.instrument?.trim();

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    !isCoordinateInIndiaScope({ latitude, longitude }) ||
    !acquiredAtUtc ||
    !satellite ||
    !instrument
  ) {
    return null;
  }

  const isModis = source === "MODIS_NRT";
  const dayNight = row.daynight === "D" || row.daynight === "N" ? row.daynight : undefined;

  const confidence = getConfidence(row, source);
  return {
    id: [source, latitude.toFixed(5), longitude.toFixed(5), row.acq_date, row.acq_time, satellite].join(":"),
    source: "NASA_FIRMS",
    sensor: source,
    latitude,
    longitude,
    acquiredAtUtc,
    satellite,
    instrument,
    confidence,
    brightnessKelvin: getNumber(row, isModis ? "brightness" : "bright_ti4"),
    secondaryBrightnessKelvin: getNumber(row, isModis ? "bright_t31" : "bright_ti5"),
    scanKm: getNumber(row, "scan"),
    trackKm: getNumber(row, "track"),
    frpMw: getNumber(row, "frp"),
    intensityLevel: intensityLevelForConfidence(confidence?.class),
    dayNight,
    version: row.version?.trim() || undefined,
    fetchedAtUtc,
  };
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`FIRMS returned HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSource(source: UpstreamSource, mapKey: string, dayRange: number, fetchedAtUtc: string) {
  const url = [
    FIRMS_AREA_API,
    encodeURIComponent(mapKey),
    source,
    INDIA_BOUNDING_BOX,
    String(dayRange),
  ].join("/");
  const csv = await fetchText(url);
  return parseCsv(csv)
    .map((row) => normalizeRow(row, source, fetchedAtUtc))
    .filter((detection): detection is FireDetection => detection !== null);
}

export async function getDetections(mapKey: string, dayRange: number): Promise<FireDetectionsPayload> {
  const fetchedAtUtc = new Date().toISOString();
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => ({ source, detections: await fetchSource(source, mapKey, dayRange, fetchedAtUtc) })),
  );
  const successful = results.filter(
    (result): result is PromiseFulfilledResult<{ source: UpstreamSource; detections: FireDetection[] }> => result.status === "fulfilled",
  );

  if (successful.length === 0) {
    throw new Error("No FIRMS sources could be loaded.");
  }

  return {
    detections: successful
      .flatMap((result) => result.value.detections)
      .sort((a, b) => Date.parse(b.acquiredAtUtc) - Date.parse(a.acquiredAtUtc)),
    fetchedAtUtc,
    sourceStatus: SOURCES.map((source) => {
      const result = successful.find((item) => item.value.source === source);
      return result
        ? { source, status: "ready", detectionCount: result.value.detections.length }
        : { source, status: "unavailable" };
    }),
  };
}

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, 405);
    }

    const dayRange = parseDayRange(request);
    if (dayRange === null) {
      return json({ error: "The days query parameter must be an integer from 1 through 5." }, 400);
    }

    const mapKey = process.env.FIRMS_MAP_KEY;
    if (!mapKey) {
      return json({ error: "Satellite data service is not configured." }, 503);
    }

    const cached = cache.get(dayRange);
    if (cached && cached.expiresAt > Date.now()) {
      return json(cached.response, 200, "public, max-age=60, s-maxage=600, stale-while-revalidate=300");
    }

    try {
      const response = await getDetections(mapKey, dayRange);
      cache.set(dayRange, { response, expiresAt: Date.now() + CACHE_TTL_MS });
      return json(response, 200, "public, max-age=60, s-maxage=600, stale-while-revalidate=300");
    } catch {
      if (cached) {
        return json(
          { ...cached.response, isStale: true },
          200,
          "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        );
      }

      return json({ error: "Latest satellite data is temporarily unavailable." }, 502);
    }
  },
};

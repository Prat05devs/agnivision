import type { FireDataResponse, FireDetection } from "../types/fire";
import { intensityLevelForConfidence } from "../utils/intensity";

class FireDataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FireDataUnavailableError";
  }
}

function isFireDetection(value: unknown): value is FireDetection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FireDetection>;
  return (
    typeof candidate.id === "string" &&
    candidate.source === "NASA_FIRMS" &&
    typeof candidate.sensor === "string" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    typeof candidate.acquiredAtUtc === "string" &&
    typeof candidate.satellite === "string" &&
    typeof candidate.instrument === "string" &&
    typeof candidate.fetchedAtUtc === "string"
  );
}

function decodeResponse(payload: unknown): FireDataResponse {
  if (!payload || typeof payload !== "object") {
    throw new FireDataUnavailableError("The data service returned an invalid response.");
  }

  const candidate = payload as Partial<FireDataResponse>;
  if (!Array.isArray(candidate.detections) || !candidate.detections.every(isFireDetection)) {
    throw new FireDataUnavailableError("The data service returned unrecognized detection data.");
  }

  return {
    detections: candidate.detections.map((detection) => ({
      ...detection,
      intensityLevel: detection.intensityLevel ?? intensityLevelForConfidence(detection.confidence?.class),
    })),
    fetchedAtUtc:
      typeof candidate.fetchedAtUtc === "string"
        ? candidate.fetchedAtUtc
        : candidate.detections[0]?.fetchedAtUtc ?? new Date().toISOString(),
    isStale: candidate.isStale === true,
  };
}

function getDevelopmentResponse(): FireDataResponse {
  const fetchedAtUtc = new Date().toISOString();
  const now = Date.now();

  return {
    fetchedAtUtc,
    detections: [
      {
        id: "development-preview-1",
        source: "NASA_FIRMS",
        sensor: "VIIRS_NOAA20_NRT",
        latitude: 30.3165,
        longitude: 78.0322,
        acquiredAtUtc: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        satellite: "NOAA-20",
        instrument: "VIIRS",
        confidence: { raw: "n", class: "nominal" },
        frpMw: 8.4,
        intensityLevel: 2,
        dayNight: "D",
        fetchedAtUtc,
      },
      {
        id: "development-preview-2",
        source: "NASA_FIRMS",
        sensor: "MODIS_NRT",
        latitude: 29.3919,
        longitude: 79.4542,
        acquiredAtUtc: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
        satellite: "Aqua",
        instrument: "MODIS",
        confidence: { raw: 82, class: "high" },
        frpMw: 5.7,
        intensityLevel: 3,
        dayNight: "D",
        fetchedAtUtc,
      },
    ],
  };
}

export const fireRepository = {
  async getRecentDetections(): Promise<FireDataResponse> {
    if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_FIRE_DATA === "true") {
      return getDevelopmentResponse();
    }

    const baseUrl = process.env.EXPO_PUBLIC_FIRE_DATA_URL;
    if (!baseUrl || baseUrl.includes("your-api.example.com")) {
      throw new FireDataUnavailableError(
        "The AgniVision.live data service is not configured in this installation.",
      );
    }

    let requestUrl: URL;
    try {
      requestUrl = new URL(baseUrl);
      requestUrl.searchParams.set("days", "5");
    } catch {
      throw new FireDataUnavailableError("EXPO_PUBLIC_FIRE_DATA_URL must be an absolute URL.");
    }

    const response = await fetch(requestUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new FireDataUnavailableError(`Satellite data is temporarily unavailable (HTTP ${response.status}).`);
    }

    return decodeResponse(await response.json());
  },
};

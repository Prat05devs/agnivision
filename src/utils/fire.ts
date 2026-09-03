import { referencePlaces } from "../data/referencePlaces";
import type { ConfidenceFilter, Coordinate, FireDetection, SensorFilter, TimeWindow } from "../types/fire";

export type { ConfidenceFilter, SensorFilter } from "../types/fire";

export const INDIA_INITIAL_REGION = {
  latitude: 22.9734,
  longitude: 78.6569,
  latitudeDelta: 34,
  longitudeDelta: 34,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function filterDetectionsByTime(
  detections: FireDetection[],
  timeWindow: TimeWindow,
  now = Date.now(),
) {
  const dayCount = timeWindow === "24h" ? 1 : timeWindow === "3d" ? 3 : 5;
  const cutoff = now - dayCount * DAY_IN_MS;

  return detections.filter((detection) => {
    const observedAt = Date.parse(detection.acquiredAtUtc);
    return !Number.isNaN(observedAt) && observedAt >= cutoff;
  });
}

export function filterDetections(
  detections: FireDetection[],
  timeWindow: TimeWindow,
  sensorFilter: SensorFilter = "all",
  confidenceFilter: ConfidenceFilter = "all",
) {
  return filterDetectionsByTime(detections, timeWindow).filter((detection) => {
    const matchesSensor =
      sensorFilter === "all" ||
      (sensorFilter === "modis" && detection.sensor === "MODIS_NRT") ||
      (sensorFilter === "viirs" && detection.sensor.startsWith("VIIRS_"));
    const matchesConfidence =
      confidenceFilter === "all" || detection.confidence?.class === confidenceFilter;

    return matchesSensor && matchesConfidence;
  });
}

export function formatObservationTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatRelativeObservationTime(timestamp: string, now = Date.now()) {
  const observedAt = Date.parse(timestamp);
  if (Number.isNaN(observedAt)) {
    return "Time unavailable";
  }

  const minutes = Math.max(0, Math.floor((now - observedAt) / (60 * 1000)));
  if (minutes < 1) {
    return "Observed moments ago";
  }

  if (minutes < 60) {
    return `Observed ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Observed ${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `Observed ${days} day${days === 1 ? "" : "s"} ago`;
}

export function getDetectionRegionLabel(detection: FireDetection) {
  const coordinate = { latitude: detection.latitude, longitude: detection.longitude };
  const nearestPlace = referencePlaces
    .map((place) => ({
      place,
      distanceKm: haversineDistanceKm(place.coordinate, coordinate),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (!nearestPlace) {
    return `${detection.latitude.toFixed(3)}°, ${detection.longitude.toFixed(3)}°`;
  }

  if (nearestPlace.distanceKm < 15) {
    return `Near ${nearestPlace.place.name}, ${nearestPlace.place.region}`;
  }

  const bearing = getBearingDegrees(nearestPlace.place.coordinate, coordinate);
  return `${Math.round(nearestPlace.distanceKm)} km ${formatCardinalDirection(bearing)} of ${nearestPlace.place.name}, ${nearestPlace.place.region}`;
}

function getBearingDegrees(from: Coordinate, to: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(deltaLongitude);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function formatCardinalDirection(bearing: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  return directions[Math.round(bearing / 45) % directions.length];
}

export function formatSensor(sensor: FireDetection["sensor"]) {
  return sensor.replaceAll("_", " ").replace("NOAA20", "NOAA-20").replace("NOAA21", "NOAA-21");
}

export function formatPublicObservationType(detection: FireDetection) {
  return detection.sensor === "MODIS_NRT" ? "Broad-area observation" : "High-resolution observation";
}

export function formatConfidence(detection: FireDetection) {
  if (!detection.confidence?.class) {
    return "Confidence unavailable";
  }

  return `${detection.confidence.class[0]?.toUpperCase()}${detection.confidence.class.slice(1)} confidence`;
}

export function haversineDistanceKm(from: Coordinate, to: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(distanceKm: number) {
  return distanceKm < 10 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceKm)} km`;
}

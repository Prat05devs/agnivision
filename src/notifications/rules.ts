import type { FireDetection, ConfidenceClass, Coordinate } from "../types/fire";
import type {
  MinimumNotificationSeverity,
  NotificationSeverity,
  NotificationPreferences,
  WatchedDestination,
} from "../types/notification";

const EARTH_RADIUS_KM = 6371;
const severityRank: Record<ConfidenceClass, number> = { low: 0, nominal: 1, high: 2 };

export function getDetectionSeverity(detection: FireDetection): ConfidenceClass {
  return detection.confidence?.class ?? "low";
}

export function meetsMinimumSeverity(
  detection: FireDetection,
  minimum: MinimumNotificationSeverity,
) {
  const required = minimum === "all" ? 0 : minimum === "nominal" ? 1 : 2;
  return severityRank[getDetectionSeverity(detection)] >= required;
}

export function distanceKm(a: Coordinate, b: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const h =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function matchingDetections(
  detections: FireDetection[],
  center: Coordinate,
  radiusKm: number,
  minimum: MinimumNotificationSeverity,
) {
  return detections
    .filter((detection) => meetsMinimumSeverity(detection, minimum))
    .map((detection) => ({
      detection,
      distanceKm: distanceKm(center, {
        latitude: detection.latitude,
        longitude: detection.longitude,
      }),
    }))
    .filter((match) => match.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function isQuietTime(preferences: NotificationPreferences, utcDate: Date) {
  if (!preferences.quietHours.enabled) {
    return false;
  }

  const hour = utcDate.getUTCHours();
  const { startHour, endHour } = preferences.quietHours;
  return startHour === endHour
    ? true
    : startHour < endHour
      ? hour >= startHour && hour < endHour
      : hour >= startHour || hour < endHour;
}

export function mayInterruptDuringQuietHours(
  severity: NotificationSeverity,
  preferences: NotificationPreferences,
) {
  return (severity === "high" || severity === "severe" || severity === "extreme") && preferences.quietHours.allowHighOverride;
}

export function createWatchedDestination(
  destination: { id: string; name: string; region: string; coordinate: Coordinate },
): WatchedDestination {
  return {
    ...destination,
    radiusKm: 25,
    createdAtUtc: new Date().toISOString(),
  };
}

export function formatDetectionSource(_detection: FireDetection) {
  return "Satellite observation";
}

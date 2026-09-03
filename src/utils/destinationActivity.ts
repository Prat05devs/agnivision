import type { Destination } from "../types/destination";
import type { FireDetection } from "../types/fire";
import { haversineDistanceKm } from "./fire";

export const DESTINATION_ACTIVITY_RADIUS_KM = 50;
export const DESTINATION_ACTIVITY_LOOKBACK_DAYS = 5;

const LOOKBACK_MS = DESTINATION_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

export type NearbyDestinationDetection = {
  detection: FireDetection;
  distanceKm: number;
};

export function getNearbyDestinationDetections(
  detections: FireDetection[],
  destination: Destination,
  now = Date.now(),
): NearbyDestinationDetection[] {
  const cutoff = now - LOOKBACK_MS;

  return detections
    .filter((detection) => {
      const observedAt = Date.parse(detection.acquiredAtUtc);
      return !Number.isNaN(observedAt) && observedAt >= cutoff && observedAt <= now;
    })
    .map((detection) => ({
      detection,
      distanceKm: haversineDistanceKm(destination.coordinate, {
        latitude: detection.latitude,
        longitude: detection.longitude,
      }),
    }))
    .filter(({ distanceKm }) => distanceKm <= DESTINATION_ACTIVITY_RADIUS_KM)
    .sort((a, b) => Date.parse(b.detection.acquiredAtUtc) - Date.parse(a.detection.acquiredAtUtc));
}

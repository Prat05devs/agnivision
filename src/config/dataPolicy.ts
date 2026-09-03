import type { FireDetection } from "../types/fire";

export const OBSERVATION_RETENTION_DAYS = 5;
export const MAX_RETAINED_OBSERVATIONS = 2500;

const RETENTION_WINDOW_MS = OBSERVATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function applyObservationRetentionPolicy(detections: FireDetection[], now = Date.now()) {
  const cutoff = now - RETENTION_WINDOW_MS;
  const uniqueDetections = new Map<string, FireDetection>();

  for (const detection of detections) {
    const observedAt = Date.parse(detection.acquiredAtUtc);
    if (!Number.isNaN(observedAt) && observedAt >= cutoff) {
      uniqueDetections.set(detection.id, detection);
    }
  }

  return [...uniqueDetections.values()]
    .sort((a, b) => Date.parse(b.acquiredAtUtc) - Date.parse(a.acquiredAtUtc))
    .slice(0, MAX_RETAINED_OBSERVATIONS);
}

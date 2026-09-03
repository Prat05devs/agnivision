import type { ConfidenceClass, FireDetection, IntensityLevel } from "../types/fire";

export function intensityLevelForConfidence(confidence?: ConfidenceClass): IntensityLevel {
  if (confidence === "high") return 3;
  if (confidence === "nominal") return 2;
  return 1;
}

export function getIntensityLevel(detection: Pick<FireDetection, "confidence" | "intensityLevel">): IntensityLevel {
  return detection.intensityLevel ?? intensityLevelForConfidence(detection.confidence?.class);
}

export function intensityLabel(level: IntensityLevel) {
  return level === 3 ? "High" : level === 2 ? "Nominal" : "Low";
}


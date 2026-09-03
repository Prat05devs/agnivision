import type { FireDetection } from "../types/fire";
import { isInsideIndiaBoundary } from "./indiaBoundary";

export const THERMAL_HEATMAP_GRADIENT = {
  colorMapSize: 256,
  colors: ["rgba(0,180,255,0)", "#16B9E8", "#38C86B", "#F2DC45", "#FF8A20", "#D92D20"],
  // Bring yellow/orange into the middle-density range while reserving red for
  // the strongest density cores. This keeps a smaller hotspot visibly cooler
  // than the densest hotspot in the same map view.
  startPoints: [0, 0.03, 0.08, 0.16, 0.38, 1],
};

export function buildThermalHeatmapPoints(detections: FireDetection[]) {
  return detections.flatMap((detection) => {
    const coordinate = { latitude: detection.latitude, longitude: detection.longitude };
    if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) return [];
    if (!isInsideIndiaBoundary(coordinate)) return [];

    // Every filtered observation contributes one equal unit. The native heatmap
    // sums nearby units, so color represents incident density instead of severity
    // or an opaque cluster count.
    return [{ ...coordinate, weight: 1 }];
  });
}

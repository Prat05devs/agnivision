import { useMemo } from "react";
import { Heatmap } from "react-native-maps";

import { buildThermalHeatmapPoints, THERMAL_HEATMAP_GRADIENT } from "../map/thermalHeatmap";
import type { FireDetection } from "../types/fire";

export function ThermalHeatLayer({ detections, radius = 38 }: { detections: FireDetection[]; radius?: number }) {
  const points = useMemo(() => buildThermalHeatmapPoints(detections), [detections]);

  if (points.length === 0) return null;

  return (
    <Heatmap
      gradient={THERMAL_HEATMAP_GRADIENT}
      opacity={0.68}
      points={points}
      radius={radius}
    />
  );
}

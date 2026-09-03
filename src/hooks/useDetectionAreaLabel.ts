import { useEffect, useMemo, useState } from "react";

import { peekDetectionAreaLabel, resolveDetectionAreaLabel } from "../services/detectionAreaService";
import type { FireDetection } from "../types/fire";
import { getDetectionRegionLabel } from "../utils/fire";

export function useDetectionAreaLabel(detection: FireDetection | null) {
  const fallback = useMemo(
    () => detection ? getDetectionRegionLabel(detection) : "Area unavailable",
    [detection],
  );
  const coordinate = detection
    ? { latitude: detection.latitude, longitude: detection.longitude }
    : null;
  const initialResolved = coordinate ? peekDetectionAreaLabel(coordinate) : undefined;
  const [result, setResult] = useState(() => ({
    label: initialResolved ?? fallback,
    isResolved: Boolean(initialResolved),
  }));

  useEffect(() => {
    if (!coordinate) {
      setResult({ label: fallback, isResolved: false });
      return;
    }

    let active = true;
    const cached = peekDetectionAreaLabel(coordinate);
    setResult({ label: cached ?? fallback, isResolved: Boolean(cached) });
    void resolveDetectionAreaLabel(coordinate).then((resolved) => {
      if (active && resolved) setResult({ label: resolved, isResolved: true });
    });
    return () => {
      active = false;
    };
  }, [coordinate?.latitude, coordinate?.longitude, fallback]);

  return result;
}

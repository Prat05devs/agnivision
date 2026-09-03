import type { Coordinate, FireDetection, IntensityLevel } from "../types/fire";
import { getIntensityLevel } from "../utils/intensity";
import { isInsideIndiaBoundary } from "./indiaBoundary";

export type MapRegion = Coordinate & { latitudeDelta: number; longitudeDelta: number };

export type ClusterNode = {
  id: string;
  bounds: { northEast: Coordinate; southWest: Coordinate };
  centroid: Coordinate;
  count: number;
  intensityLevel: IntensityLevel;
  memberIds: string[];
};

export type RenderableMapNode =
  | { kind: "cluster"; cluster: ClusterNode }
  | { kind: "detection"; detection: FireDetection };

export const INDIA_DATA_BOUNDS = { west: 68.1, south: 6.5, east: 97.5, north: 37.6 } as const;
export const INDIA_INITIAL_REGION: MapRegion = {
  latitude: (INDIA_DATA_BOUNDS.south + INDIA_DATA_BOUNDS.north) / 2,
  longitude: (INDIA_DATA_BOUNDS.west + INDIA_DATA_BOUNDS.east) / 2,
  latitudeDelta: 34,
  longitudeDelta: 34,
};

export function isCoordinateInIndiaScope(coordinate: Coordinate) {
  const insideEnvelope = coordinate.latitude >= INDIA_DATA_BOUNDS.south &&
    coordinate.latitude <= INDIA_DATA_BOUNDS.north &&
    coordinate.longitude >= INDIA_DATA_BOUNDS.west &&
    coordinate.longitude <= INDIA_DATA_BOUNDS.east;
  return insideEnvelope && isInsideIndiaBoundary(coordinate);
}

export function zoomFromLongitudeDelta(longitudeDelta: number) {
  return Math.max(1, Math.min(20, Math.log2(360 / Math.max(longitudeDelta, 0.00001))));
}

function cellSizeForZoom(zoom: number) {
  if (zoom < 5.5) return 4.5;
  if (zoom < 7.5) return 1.7;
  if (zoom < 10) return 0.42;
  return 0;
}

function isInBufferedRegion(detection: FireDetection, region: MapRegion) {
  const latitudeMargin = region.latitudeDelta * 0.15;
  const longitudeMargin = region.longitudeDelta * 0.15;
  return (
    Math.abs(detection.latitude - region.latitude) <= region.latitudeDelta / 2 + latitudeMargin &&
    Math.abs(detection.longitude - region.longitude) <= region.longitudeDelta / 2 + longitudeMargin
  );
}

export function clusterDetections(detections: FireDetection[], region: MapRegion): RenderableMapNode[] {
  const visible = detections.filter((detection) =>
    isCoordinateInIndiaScope({ latitude: detection.latitude, longitude: detection.longitude }) &&
    isInBufferedRegion(detection, region));
  const zoom = zoomFromLongitudeDelta(region.longitudeDelta);
  const baseCellSize = cellSizeForZoom(zoom);
  if (baseCellSize === 0 && visible.length <= 350) {
    return visible.map((detection) => ({ kind: "detection" as const, detection }));
  }

  // At unusually high density, retain clustering even at city zoom so gesture
  // performance wins over decorative detail.
  const cellSize = baseCellSize || Math.max(0.035, Math.sqrt(visible.length / 350) * 0.035);
  const buckets = new Map<string, FireDetection[]>();
  visible.forEach((detection) => {
    const x = Math.floor((detection.longitude + 180) / cellSize);
    const y = Math.floor((detection.latitude + 90) / cellSize);
    const key = `${x}:${y}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(detection);
    buckets.set(key, bucket);
  });

  return [...buckets.entries()].map(([cell, members]) => {
    if (members.length === 1) return { kind: "detection" as const, detection: members[0]! };
    const latitudes = members.map((member) => member.latitude);
    const longitudes = members.map((member) => member.longitude);
    const intensityLevel = members.reduce<IntensityLevel>(
      (highest, member) => Math.max(highest, getIntensityLevel(member)) as IntensityLevel,
      1,
    );
    return {
      kind: "cluster" as const,
      cluster: {
        id: `cluster:${Math.floor(zoom)}:${cell}`,
        bounds: {
          northEast: { latitude: Math.max(...latitudes), longitude: Math.max(...longitudes) },
          southWest: { latitude: Math.min(...latitudes), longitude: Math.min(...longitudes) },
        },
        centroid: {
          latitude: latitudes.reduce((sum, value) => sum + value, 0) / members.length,
          longitude: longitudes.reduce((sum, value) => sum + value, 0) / members.length,
        },
        count: members.length,
        intensityLevel,
        memberIds: members.map((member) => member.id),
      },
    };
  });
}

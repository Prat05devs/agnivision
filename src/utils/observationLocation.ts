import type { Coordinate } from "../types/fire";

const SHARE_COORDINATE_PRECISION = 5;

export function formatObservationCoordinates(coordinate: Coordinate) {
  return `${coordinate.latitude.toFixed(SHARE_COORDINATE_PRECISION)}, ${coordinate.longitude.toFixed(SHARE_COORDINATE_PRECISION)}`;
}

export function getObservationMapUrl(coordinate: Coordinate) {
  const query = `${coordinate.latitude.toFixed(SHARE_COORDINATE_PRECISION)},${coordinate.longitude.toFixed(SHARE_COORDINATE_PRECISION)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getObservationLocationShareMessage(coordinate: Coordinate, areaLabel: string) {
  return [
    `AgniVision satellite thermal observation near ${areaLabel}`,
    `Coordinates: ${formatObservationCoordinates(coordinate)}`,
    `Open location: ${getObservationMapUrl(coordinate)}`,
    "This is a satellite detection, not a confirmed ground fire.",
  ].join("\n");
}

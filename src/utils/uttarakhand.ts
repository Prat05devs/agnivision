import boundaryData from "../data/uttarakhandBoundary.json";
import type { OfficialAdvisory } from "../types/advisory";
import type { Coordinate } from "../types/fire";

type Position = [longitude: number, latitude: number];
type Ring = Position[];
type Polygon = Ring[];

const districts = boundaryData.districts as unknown as Array<{ name: string; polygons: Polygon[] }>;
const regionNames = ["uttarakhand", "uttaranchal"];

function isPointInRing([longitude, latitude]: Position, ring: Ring) {
  let inside = false;

  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
    const [currentLongitude, currentLatitude] = ring[current]!;
    const [previousLongitude, previousLatitude] = ring[previous]!;
    const crossesLatitude = currentLatitude > latitude !== previousLatitude > latitude;
    const boundaryLongitude =
      ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) +
      currentLongitude;

    if (crossesLatitude && longitude < boundaryLongitude) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygon(position: Position, polygon: Polygon) {
  const [outerRing, ...holes] = polygon;
  return Boolean(outerRing && isPointInRing(position, outerRing) && !holes.some((hole) => isPointInRing(position, hole)));
}

export function isCoordinateInUttarakhand(coordinate: Coordinate) {
  const position: Position = [coordinate.longitude, coordinate.latitude];
  return districts.some((district) => district.polygons.some((polygon) => isPointInPolygon(position, polygon)));
}

export function isAdvisoryForUttarakhand(advisory: OfficialAdvisory) {
  const describedArea = [advisory.state, advisory.district, advisory.areaDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (regionNames.some((name) => describedArea.includes(name))) {
    return true;
  }

  return (
    advisory.latitude !== undefined &&
    advisory.longitude !== undefined &&
    isCoordinateInUttarakhand({ latitude: advisory.latitude, longitude: advisory.longitude })
  );
}

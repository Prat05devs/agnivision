import type { Coordinate } from "../types/fire";

export const DETECTION_AREA_CELL_DEGREES = 0.025;

export type DetectionArea = {
  area: string;
  city?: string;
  district?: string;
  state: string;
  label: string;
};

export type AddressComponent = {
  long_name?: string;
  types?: string[];
};

export function detectionAreaCellKey(coordinate: Coordinate) {
  const latitudeCell = Math.round(coordinate.latitude / DETECTION_AREA_CELL_DEGREES);
  const longitudeCell = Math.round(coordinate.longitude / DETECTION_AREA_CELL_DEGREES);
  return `${latitudeCell}:${longitudeCell}`;
}

function componentName(components: AddressComponent[], ...types: string[]) {
  for (const type of types) {
    const match = components.find((component) => component.types?.includes(type));
    const name = match?.long_name?.trim();
    if (name) return name;
  }
  return undefined;
}

function uniqueParts(parts: Array<string | undefined>) {
  const result: string[] = [];
  for (const part of parts) {
    if (!part || result.some((existing) => existing.localeCompare(part, undefined, { sensitivity: "accent" }) === 0)) continue;
    result.push(part);
  }
  return result;
}

export function detectionAreaFromAddressComponents(components: AddressComponent[]): DetectionArea | null {
  const state = componentName(components, "administrative_area_level_1");
  if (!state) return null;

  const locality = componentName(components, "locality");
  const area = componentName(
    components,
    "neighborhood",
    "sublocality_level_2",
    "sublocality_level_1",
    "sublocality",
    "locality",
    "administrative_area_level_3",
    "administrative_area_level_2",
  );
  const district = componentName(components, "administrative_area_level_2");
  if (!area) return null;

  const city = locality && locality !== area ? locality : undefined;
  const districtContext = !city && district !== area ? district : undefined;
  const labelParts = uniqueParts([area, city ?? districtContext, state]);

  return {
    area,
    ...(city ? { city } : {}),
    ...(district && district !== area ? { district } : {}),
    state,
    label: `Near ${labelParts.join(", ")}`,
  };
}

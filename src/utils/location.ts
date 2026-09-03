export type GeocodedAddressParts = {
  name?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
};

function cleanPart(value: string | null | undefined) {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

function isUsefulPlaceName(value: string | null) {
  return value !== null && /[A-Za-z\p{L}]/u.test(value);
}

export function formatLocationLabel(address: GeocodedAddressParts | null | undefined) {
  if (!address) {
    return null;
  }

  const name = cleanPart(address.name);
  const street = cleanPart(address.street);
  const specificPlace = isUsefulPlaceName(name) ? name : street;
  const city = cleanPart(address.city) ?? cleanPart(address.subregion);
  const candidates = [specificPlace, cleanPart(address.district), city, cleanPart(address.region)];
  const uniqueParts: string[] = [];

  for (const part of candidates) {
    if (!part || uniqueParts.some((existing) => existing.localeCompare(part, undefined, { sensitivity: "accent" }) === 0)) {
      continue;
    }

    uniqueParts.push(part);
  }

  return uniqueParts.length > 0 ? uniqueParts.join(", ") : null;
}

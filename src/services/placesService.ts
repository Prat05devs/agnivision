import Constants from "expo-constants";

import type { Destination } from "../types/destination";

export type PlaceSuggestion = { placeId: string; text: string; mainText: string; secondaryText: string };

function placesUrl() {
  const configured = process.env.EXPO_PUBLIC_PLACES_API_URL ?? Constants.expoConfig?.extra?.placesApiUrl;
  if (typeof configured === "string" && configured) return configured;
  const fireDataUrl = process.env.EXPO_PUBLIC_FIRE_DATA_URL;
  if (fireDataUrl) return `${new URL(fireDataUrl).origin}/api/places`;
  throw new Error("Destination search is unavailable in this installation.");
}

async function request(body: object) {
  const response = await fetch(placesUrl(), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Destination search returned HTTP ${response.status}.`);
  return payload;
}

export async function searchPlaces(input: string, sessionToken: string) {
  const payload = await request({ input, sessionToken }) as { suggestions?: PlaceSuggestion[] };
  return payload.suggestions ?? [];
}

export async function getPlaceDestination(placeId: string, sessionToken: string) {
  const payload = await request({ placeId, sessionToken }) as { destination?: Destination };
  if (!payload.destination) throw new Error("The selected destination is unavailable.");
  return payload.destination;
}

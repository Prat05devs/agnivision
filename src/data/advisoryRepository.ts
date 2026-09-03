import Constants from "expo-constants";

import type { AdvisoryDataResponse, OfficialAdvisory } from "../types/advisory";

class AdvisoryDataUnavailableError extends Error {}

function isAdvisory(value: unknown): value is OfficialAdvisory {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OfficialAdvisory>;
  return typeof item.id === "string" && typeof item.event === "string" && typeof item.headline === "string" && typeof item.issuedAt === "string" && item.source === "NDMA_SACHET";
}

function endpoint() {
  const configured = process.env.EXPO_PUBLIC_ADVISORIES_API_URL ?? (Constants.expoConfig?.extra?.advisoriesApiUrl as string | undefined);
  if (configured) return configured;
  const fireUrl = process.env.EXPO_PUBLIC_FIRE_DATA_URL ?? (Constants.expoConfig?.extra?.fireDataUrl as string | undefined);
  if (fireUrl) return new URL("advisories", fireUrl.endsWith("/") ? fireUrl : fireUrl.replace(/[^/]+$/, "")).toString();
  throw new AdvisoryDataUnavailableError("The official advisory service is not configured in this installation.");
}

export const advisoryRepository = {
  async getActiveAdvisories(): Promise<AdvisoryDataResponse> {
    const response = await fetch(endpoint(), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new AdvisoryDataUnavailableError("Official advisory data is temporarily unavailable.");
    const payload = (await response.json()) as Partial<AdvisoryDataResponse>;
    if (!Array.isArray(payload.advisories) || !payload.advisories.every(isAdvisory)) throw new AdvisoryDataUnavailableError("The advisory service returned unrecognized data.");
    const now = new Date().toISOString();
    return { advisories: payload.advisories, fetchedAtUtc: payload.fetchedAtUtc ?? now, lastCheckedAtUtc: payload.lastCheckedAtUtc ?? payload.fetchedAtUtc ?? now, isStale: payload.isStale, isUnavailable: payload.isUnavailable };
  },
};

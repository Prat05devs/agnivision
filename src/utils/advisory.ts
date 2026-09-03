import type { AdvisorySeverity, OfficialAdvisory } from "../types/advisory";
import type { Destination } from "../types/destination";
import { haversineDistanceKm } from "./fire";

export const advisorySeverityLabel: Record<AdvisorySeverity, string> = { info: "Information", minor: "Minor", moderate: "Moderate", severe: "Severe", extreme: "Extreme" };

export const advisorySeverityColor: Record<AdvisorySeverity, string> = { info: "#386A8A", minor: "#6B6B32", moderate: "#B56714", severe: "#A33B2E", extreme: "#72233B" };

export function advisoriesForDestination(advisories: OfficialAdvisory[], destination: Destination) {
  const region = destination.region.toLowerCase();
  const name = destination.name.toLowerCase();
  return advisories.filter((advisory) => {
    if (advisory.state?.toLowerCase() === region || advisory.district?.toLowerCase().includes(name) || advisory.areaDescription?.toLowerCase().includes(name)) return true;
    return advisory.latitude !== undefined && advisory.longitude !== undefined && haversineDistanceKm(destination.coordinate, { latitude: advisory.latitude, longitude: advisory.longitude }) <= 50;
  });
}

export function formatAdvisoryTime(value?: string) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function advisoryFreshness(value: string | null) {
  if (!value) return "Not checked yet";
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Checked just now";
  if (minutes < 60) return `Last checked ${minutes} min ago`;
  return `Last checked ${Math.round(minutes / 60)} hr ago`;
}

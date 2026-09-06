import type { Coordinate } from "../src/types/fire";
import type { NotificationPreferences, WatchedDestination } from "../src/types/notification";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/types/notification";
import { json } from "./_notificationHttp";
import {
  deviceSecretMatches,
  getDevice,
  hashDeviceSecret,
  saveDevice,
  type DeviceRecord,
} from "./_notificationStore";

function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== "object") return false;
  const coordinate = value as Coordinate;
  return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude) && Math.abs(coordinate.latitude) <= 90 && Math.abs(coordinate.longitude) <= 180;
}

function parsePreferences(value: unknown): NotificationPreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<NotificationPreferences>;
  const radius = candidate.proximityRadiusKm;
  const minimum = candidate.minimumSeverity;
  const booleanValues = [candidate.masterEnabled, candidate.proximityEnabled, candidate.regionalHotspotsEnabled, candidate.weeklyDigestEnabled, candidate.systemStatusEnabled, candidate.officialAdvisoriesEnabled, candidate.minorAdvisoriesEnabled, candidate.quietHours?.enabled, candidate.quietHours?.allowHighOverride];
  if (booleanValues.some((item) => typeof item !== "boolean") || ![5, 10, 25, 50].includes(radius ?? 0) || !["all", "nominal", "high"].includes(minimum ?? "") || !Number.isFinite(candidate.quietHours?.startHour) || !Number.isFinite(candidate.quietHours?.endHour)) return null;
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...candidate,
    proximityRadiusKm: radius as NotificationPreferences["proximityRadiusKm"],
    minimumSeverity: minimum as NotificationPreferences["minimumSeverity"],
    quietHours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
      ...candidate.quietHours,
      startHour: Math.min(23, Math.max(0, Math.trunc(candidate.quietHours?.startHour ?? 22))),
      endHour: Math.min(23, Math.max(0, Math.trunc(candidate.quietHours?.endHour ?? 7))),
    },
  };
}

function parseWatches(value: unknown): WatchedDestination[] | null {
  if (!Array.isArray(value) || value.length > 25) return null;
  const watches = value.filter((watch): watch is WatchedDestination => {
    if (!watch || typeof watch !== "object") return false;
    const item = watch as WatchedDestination;
    return typeof item.id === "string" && item.id.length <= 100 && typeof item.name === "string" && item.name.length <= 100 && typeof item.region === "string" && item.region.length <= 100 && isCoordinate(item.coordinate) && [5, 10, 25, 50].includes(item.radiusKm);
  });
  return watches.length === value.length ? watches : null;
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    try {
      const installationId = request.headers.get("X-Agnivision-Installation") ?? "";
      const authorization = request.headers.get("Authorization") ?? "";
      const secret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!/^[a-f0-9-]{30,50}$/i.test(installationId) || secret.length < 32 || secret.length > 256) return json({ error: "Device authentication is required." }, 401);

      const body = (await request.json()) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid device registration." }, 400);
      if (body.installationId !== installationId) return json({ error: "Installation ID mismatch." }, 400);
      const preferences = parsePreferences(body.preferences);
      const watches = parseWatches(body.watches);
      const platform = body.platform === "android" || body.platform === "ios" ? body.platform : null;
      const locationPermission = ["off", "while-using", "always"].includes(String(body.locationPermission)) ? body.locationPermission as DeviceRecord["locationPermission"] : null;
      const expoPushToken = body.expoPushToken === null || (typeof body.expoPushToken === "string" && /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(body.expoPushToken)) ? body.expoPushToken as string | null : undefined;
      if (!preferences || !watches || !platform || !locationPermission || expoPushToken === undefined) return json({ error: "Invalid device registration." }, 400);

      const existing = await getDevice(installationId);
      if (existing && !deviceSecretMatches(existing, secret)) return json({ error: "Device authentication failed." }, 401);
      const now = new Date().toISOString();
      const coarseLocation = locationPermission === "off" ? null : isCoordinate(body.coarseLocation)
        ? { ...body.coarseLocation, updatedAtUtc: now }
        : existing?.coarseLocation ?? null;
      const timezoneOffsetMinutes = Number(body.timezoneOffsetMinutes);
      const record: DeviceRecord = {
        installationId,
        secretHash: existing?.secretHash ?? hashDeviceSecret(secret),
        expoPushToken,
        platform,
        timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes) ? Math.max(-840, Math.min(720, Math.trunc(timezoneOffsetMinutes))) : 0,
        preferences,
        watches,
        locationPermission,
        coarseLocation,
        updatedAtUtc: now,
      };
      const fields = Object.keys(record).filter((field) => field !== "coarseLocation" || locationPermission === "off" || isCoordinate(body.coarseLocation)) as Array<keyof DeviceRecord>;
      if (!await saveDevice(record, fields)) return json({ error: "Device authentication failed." }, 401);
      return json({ registered: true });
    } catch {
      return json({ error: "Device registration failed." }, 503);
    }
  },
};

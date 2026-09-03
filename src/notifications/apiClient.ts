import Constants from "expo-constants";
import { Platform } from "react-native";

import type { Coordinate } from "../types/fire";
import type {
  LocationPermissionLevel,
  NotificationInboxEntry,
  NotificationPreferences,
  WatchedDestination,
} from "../types/notification";
import { getDeviceIdentity } from "./deviceIdentity";

function getApiRoot() {
  const configured =
    process.env.EXPO_PUBLIC_NOTIFICATION_API_URL ??
    (Constants.expoConfig?.extra?.notificationApiUrl as string | undefined);
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const fireDataUrl = process.env.EXPO_PUBLIC_FIRE_DATA_URL;
  if (fireDataUrl) {
    try {
      const url = new URL(fireDataUrl);
      return `${url.origin}/api`;
    } catch {
      // A clear configuration error is thrown below.
    }
  }

  throw new Error("The notification service is unavailable in this installation.");
}

async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const identity = await getDeviceIdentity();
  const response = await fetch(`${getApiRoot()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${identity.deviceSecret}`,
      "Content-Type": "application/json",
      "X-Agnivision-Installation": identity.installationId,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Notification service returned HTTP ${response.status}.`);
  }

  return response;
}

export async function syncNotificationDevice(input: {
  expoPushToken: string | null;
  preferences: NotificationPreferences;
  watches: WatchedDestination[];
  locationPermission: LocationPermissionLevel;
  coarseLocation?: Coordinate | null;
}) {
  const identity = await getDeviceIdentity();
  await authenticatedFetch("/notification-device", {
    method: "POST",
    body: JSON.stringify({
      installationId: identity.installationId,
      platform: Platform.OS,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      ...input,
    }),
  });
}

export async function uploadCoarseLocation(coordinate: Coordinate, areaLabel?: string | null) {
  const quantized = {
    latitude: Math.round(coordinate.latitude * 100) / 100,
    longitude: Math.round(coordinate.longitude * 100) / 100,
  };
  await authenticatedFetch("/notification-location", {
    method: "POST",
    body: JSON.stringify({ coordinate: quantized, areaLabel: areaLabel?.trim() || undefined }),
  });
}

export async function clearServerLocation() {
  await authenticatedFetch("/notification-location", { method: "DELETE" });
}

export async function fetchNotificationInbox() {
  const response = await authenticatedFetch("/notification-inbox");
  const payload = (await response.json()) as { entries?: NotificationInboxEntry[] };
  return Array.isArray(payload.entries) ? payload.entries : [];
}

export async function markNotificationInboxRead() {
  await authenticatedFetch("/notification-inbox", { method: "PATCH" });
}

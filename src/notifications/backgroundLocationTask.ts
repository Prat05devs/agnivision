import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import type { LocationPermissionLevel } from "../types/notification";
import { clearServerLocation, uploadCoarseLocation } from "./apiClient";
import { runLocalProximityCheck } from "./localProximityAlerts";

export const BACKGROUND_LOCATION_TASK = "agnivision-coarse-location-update";

type LocationTaskData = { locations?: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }
    const latest = data.locations?.at(-1);
    if (!latest) {
      return;
    }
    const coordinate = {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
    };
    // The upload keeps server-side alerting working where push is configured; the
    // local check makes proximity alerts work on this device regardless.
    await uploadCoarseLocation(coordinate).catch(() => undefined);
    await runLocalProximityCheck(coordinate);
  });
}

export async function getLocationPermissionLevel(): Promise<LocationPermissionLevel> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return "off";
  }
  const background = await Location.getBackgroundPermissionsAsync();
  return background.status === "granted" ? "always" : "while-using";
}

export async function enableBackgroundLocationUpdates() {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== "granted") {
    return "off" as const;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    return "while-using" as const;
  }

  const registered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!registered) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 5000,
      deferredUpdatesDistance: 5000,
      deferredUpdatesInterval: 30 * 60 * 1000,
      deferredUpdatesTimeout: 30 * 60 * 1000,
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: false,
      foregroundService:
        Platform.OS === "android"
          ? {
              notificationTitle: "AgniVision.live proximity monitoring",
              notificationBody: "Using an approximate location to check for nearby detections and official advisories.",
              notificationColor: "#14532D",
              killServiceOnDestroy: false,
            }
          : undefined,
    });
  }
  return "always" as const;
}

export async function disableBackgroundLocationUpdates(clearRemote = false) {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  if (clearRemote) {
    await clearServerLocation();
  }
}

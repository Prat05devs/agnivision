import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { fireRepository } from "../data/fireRepository";
import { NOTIFICATION_CHANNELS } from "./notificationService";
import { getDetectionSeverity, isQuietTime, matchingDetections, mayInterruptDuringQuietHours } from "./rules";
import type { Coordinate } from "../types/fire";
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from "../types/notification";

// Remote push needs an EAS project ID and, on Android, FCM credentials. Proximity
// alerting does not: the detection feed is public, the matching rules already run on
// this device, and a locally scheduled notification needs no credentials at all. This
// evaluates the same rules the server would and posts the result locally, so alerts
// work on the phone without any push infrastructure.

const PREFERENCES_STORAGE_KEY = "agnivision.notifications.v1";
const ALERTED_STORAGE_KEY = "agnivision.notifications.localAlerted.v1";

// A single satellite pass can put many detections inside one radius. Alerting on each
// would be a burst of near-identical notifications, so only the closest few are sent.
const MAX_ALERTS_PER_RUN = 3;
// Bounds the dedupe ledger so it cannot grow without limit across months of passes.
const ALERTED_HISTORY_LIMIT = 500;

async function readPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const saved = JSON.parse(raw) as { preferences?: Partial<NotificationPreferences> };
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...saved.preferences,
      quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours, ...saved.preferences?.quietHours },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

async function readAlertedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function writeAlertedIds(ids: string[]) {
  await AsyncStorage.setItem(ALERTED_STORAGE_KEY, JSON.stringify(ids.slice(-ALERTED_HISTORY_LIMIT))).catch(
    () => undefined,
  );
}

/**
 * Evaluates the proximity rules against `center` and posts local notifications for
 * detections not already alerted on. Returns the number of notifications scheduled.
 * Never throws: it runs inside a background task where an unhandled rejection would
 * silently kill the task registration.
 */
export async function runLocalProximityCheck(center: Coordinate): Promise<number> {
  try {
    const preferences = await readPreferences();
    if (!preferences.masterEnabled || !preferences.proximityEnabled) {
      return 0;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      return 0;
    }

    const { detections } = await fireRepository.getRecentDetections();
    const matches = matchingDetections(
      detections,
      center,
      preferences.proximityRadiusKm,
      preferences.minimumSeverity,
    );
    if (matches.length === 0) {
      return 0;
    }

    const alerted = await readAlertedIds();
    const alreadyAlerted = new Set(alerted);
    const fresh = matches.filter((match) => !alreadyAlerted.has(match.detection.id));
    if (fresh.length === 0) {
      return 0;
    }

    const quiet = isQuietTime(preferences, new Date());
    const sendable = quiet
      ? fresh.filter((match) => mayInterruptDuringQuietHours(getDetectionSeverity(match.detection), preferences))
      : fresh;

    // Detections suppressed by quiet hours are still recorded as alerted so they do
    // not all arrive at once the moment quiet hours end.
    const suppressed = fresh.filter((match) => !sendable.includes(match));
    const selected = sendable.slice(0, MAX_ALERTS_PER_RUN);

    for (const match of selected) {
      const severity = getDetectionSeverity(match.detection);
      const distance = match.distanceKm < 1
        ? `${Math.round(match.distanceKm * 1000)} m`
        : `${match.distanceKm.toFixed(match.distanceKm < 10 ? 1 : 0)} km`;
      const title = "Satellite observation nearby";
      const body = `A ${severity}-confidence thermal observation was recorded about ${distance} away.`;
      const createdAtUtc = new Date().toISOString();

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            inboxEntry: {
              id: `proximity-local-${match.detection.id}`,
              category: "proximity",
              severity: severity === "high" ? "high" : "info",
              title,
              body,
              createdAtUtc,
              delivery: "pushed",
              readAtUtc: null,
              target: { detectionId: match.detection.id },
            },
          },
        },
        trigger: null,
      });
    }

    await writeAlertedIds([
      ...alerted,
      ...selected.map((match) => match.detection.id),
      ...suppressed.map((match) => match.detection.id),
    ]);
    return selected.length;
  } catch {
    // Data or storage failures must not tear down the background task.
    return 0;
  }
}

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { NotificationPermissionState } from "../types/notification";

export const NOTIFICATION_CHANNELS = {
  proximityHigh: "proximity-high",
  proximity: "proximity",
  destinationHigh: "destination-high",
  destination: "destination",
  regional: "regional-hotspots",
  digest: "weekly-digest",
  system: "system-status",
  advisory: "official-advisories",
} as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotificationCategories() {
  if (Platform.OS === "android") {
    await Promise.all([
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.proximityHigh, {
        name: "High-confidence nearby detections",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.proximity, {
        name: "Nearby detections",
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.destinationHigh, {
        name: "High-confidence destination watches",
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.destination, {
        name: "Destination watches",
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.regional, {
        name: "Regional activity",
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.digest, {
        name: "Weekly digest",
        importance: Notifications.AndroidImportance.LOW,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.system, {
        name: "Data status",
        importance: Notifications.AndroidImportance.LOW,
      }),
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.advisory, {
        name: "Official NDMA advisories",
        importance: Notifications.AndroidImportance.HIGH,
      }),
    ]);
  }

  await Promise.all(
    ["proximity", "destination", "regional", "digest", "system", "advisory"].map((category) =>
      Notifications.setNotificationCategoryAsync(category, []),
    ),
  );
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const permission = await Notifications.getPermissionsAsync();
  if (Platform.OS === "ios" && permission.ios) {
    if (
      permission.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      permission.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      permission.ios.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    ) {
      return "granted";
    }
    return permission.ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED
      ? "not-determined"
      : "denied";
  }

  return permission.status === "granted"
    ? "granted"
    : permission.status === "undetermined"
      ? "not-determined"
      : "denied";
}

export async function requestNotificationPermission() {
  await configureNotificationCategories();
  await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return getNotificationPermissionState();
}

export async function scheduleTestNotification() {
  await configureNotificationCategories();
  let permission = await getNotificationPermissionState();
  if (permission !== "granted") {
    permission = await requestNotificationPermission();
  }
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Enable them in device settings, then try again.");
  }

  const createdAtUtc = new Date().toISOString();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "AgniVision notification test",
      body: "Notifications are configured correctly on this device.",
      categoryIdentifier: "system",
      data: {
        inboxEntry: {
          id: `notification-test-${Date.now()}`,
          category: "system",
          severity: "info",
          title: "AgniVision notification test",
          body: "Notifications are configured correctly on this device.",
          createdAtUtc,
          delivery: "pushed",
          readAtUtc: null,
          target: {},
        },
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: NOTIFICATION_CHANNELS.system,
    },
  });
}

export async function getExpoPushToken() {
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.easProjectId as string | undefined) ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    throw new Error("EAS project ID is required before remote notifications can be registered.");
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

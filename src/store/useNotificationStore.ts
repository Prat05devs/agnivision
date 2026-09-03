import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as Notifications from "expo-notifications";
import { create } from "zustand";

import type { Destination } from "../types/destination";
import type {
  LocationPermissionLevel,
  NotificationInboxEntry,
  NotificationPermissionState,
  NotificationPreferences,
  WatchedDestination,
} from "../types/notification";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types/notification";
import {
  fetchNotificationInbox,
  markNotificationInboxRead,
  syncNotificationDevice,
} from "../notifications/apiClient";
import {
  disableBackgroundLocationUpdates,
  enableBackgroundLocationUpdates,
  getLocationPermissionLevel,
} from "../notifications/backgroundLocationTask";
import {
  configureNotificationCategories,
  getExpoPushToken,
  getNotificationPermissionState,
  requestNotificationPermission,
} from "../notifications/notificationService";
import { createWatchedDestination } from "../notifications/rules";

const STORAGE_KEY = "agnivision.notifications.v1";

type PersistedNotificationState = {
  preferences: NotificationPreferences;
  watches: WatchedDestination[];
  inbox: NotificationInboxEntry[];
};

type NotificationState = PersistedNotificationState & {
  hydrated: boolean;
  busy: boolean;
  error: string | null;
  notificationPermission: NotificationPermissionState;
  locationPermission: LocationPermissionLevel;
  hydrate: () => Promise<void>;
  refreshPermissionStates: () => Promise<void>;
  setMasterEnabled: (enabled: boolean) => Promise<void>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>;
  toggleDestinationWatch: (destination: Destination) => Promise<void>;
  removeDestinationWatch: (destinationId: string) => Promise<void>;
  setWatchRadius: (destinationId: string, radiusKm: WatchedDestination["radiusKm"]) => Promise<void>;
  requestAlwaysLocation: () => Promise<void>;
  clearStoredLocation: () => Promise<void>;
  syncRegistration: () => Promise<void>;
  refreshInbox: () => Promise<void>;
  ingestNotification: (notification: Notifications.Notification) => Promise<void>;
  markInboxRead: () => Promise<void>;
};

function mergeInbox(...groups: NotificationInboxEntry[][]) {
  const entries = new Map<string, NotificationInboxEntry>();
  groups.flat().forEach((entry) => entries.set(entry.id, entry));
  return [...entries.values()]
    .sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc))
    .slice(0, 200);
}

function parseInboxEntry(value: unknown): NotificationInboxEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<NotificationInboxEntry>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.body !== "string" ||
    typeof candidate.createdAtUtc !== "string" ||
    typeof candidate.category !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    category: candidate.category as NotificationInboxEntry["category"],
    severity: candidate.severity ?? "info",
    title: candidate.title,
    body: candidate.body,
    createdAtUtc: candidate.createdAtUtc,
    delivery: candidate.delivery ?? "pushed",
    readAtUtc: candidate.readAtUtc ?? null,
    target: candidate.target ?? {},
  };
}

async function persist(state: PersistedNotificationState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  watches: [],
  inbox: [],
  hydrated: false,
  busy: false,
  error: null,
  notificationPermission: "unknown",
  locationPermission: "off",

  hydrate: async () => {
    await configureNotificationCategories().catch(() => undefined);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<PersistedNotificationState>;
        set({
          preferences: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...saved.preferences,
            quietHours: {
              ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
              ...saved.preferences?.quietHours,
            },
          },
          watches: Array.isArray(saved.watches) ? saved.watches : [],
          inbox: Array.isArray(saved.inbox) ? saved.inbox : [],
        });
      } catch {
        // Ignore corrupted local preferences and keep safe defaults.
      }
    }
    set({ hydrated: true });
    await get().refreshPermissionStates();
    if (get().preferences.masterEnabled) {
      await get().syncRegistration();
      await get().refreshInbox();
    }
  },

  refreshPermissionStates: async () => {
    const [notificationPermission, locationPermission] = await Promise.all([
      getNotificationPermissionState().catch(() => "unknown" as const),
      getLocationPermissionLevel().catch(() => "off" as const),
    ]);
    set({ notificationPermission, locationPermission });
  },

  setMasterEnabled: async (enabled) => {
    set({ busy: true, error: null });
    try {
      let notificationPermission = await getNotificationPermissionState();
      if (enabled && notificationPermission !== "granted") {
        notificationPermission = await requestNotificationPermission();
      }
      if (enabled && notificationPermission !== "granted") {
        set({
          notificationPermission,
          error: "Notification permission was not granted. You can enable it later in device settings.",
        });
        return;
      }

      const preferences = { ...get().preferences, masterEnabled: enabled };
      set({ preferences, notificationPermission });
      await persist({ preferences, watches: get().watches, inbox: get().inbox });
      if (enabled && preferences.proximityEnabled && get().locationPermission === "always") {
        const locationPermission = await enableBackgroundLocationUpdates();
        set({ locationPermission });
      }
      await get().syncRegistration();
      if (!enabled) {
        await disableBackgroundLocationUpdates(false);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Notifications could not be updated." });
    } finally {
      set({ busy: false });
    }
  },

  updatePreferences: async (patch) => {
    const preferences = {
      ...get().preferences,
      ...patch,
      quietHours: patch.quietHours
        ? { ...get().preferences.quietHours, ...patch.quietHours }
        : get().preferences.quietHours,
    };
    set({ preferences, error: null });
    await persist({ preferences, watches: get().watches, inbox: get().inbox });
    if (patch.proximityEnabled === false) {
      await disableBackgroundLocationUpdates(false);
    } else if (
      patch.proximityEnabled === true &&
      preferences.masterEnabled &&
      get().locationPermission === "always"
    ) {
      const locationPermission = await enableBackgroundLocationUpdates();
      set({ locationPermission });
    }
    await get().syncRegistration();
  },

  toggleDestinationWatch: async (destination) => {
    const existing = get().watches.some((watch) => watch.id === destination.id);
    const watches = existing
      ? get().watches.filter((watch) => watch.id !== destination.id)
      : [...get().watches, createWatchedDestination(destination)];
    set({ watches, error: null });
    await persist({ preferences: get().preferences, watches, inbox: get().inbox });
    if (!existing && !get().preferences.masterEnabled) {
      await get().setMasterEnabled(true);
    } else {
      await get().syncRegistration();
    }
  },

  removeDestinationWatch: async (destinationId) => {
    const watches = get().watches.filter((watch) => watch.id !== destinationId);
    set({ watches });
    await persist({ preferences: get().preferences, watches, inbox: get().inbox });
    await get().syncRegistration();
  },

  setWatchRadius: async (destinationId, radiusKm) => {
    const watches = get().watches.map((watch) =>
      watch.id === destinationId ? { ...watch, radiusKm } : watch,
    );
    set({ watches });
    await persist({ preferences: get().preferences, watches, inbox: get().inbox });
    await get().syncRegistration();
  },

  requestAlwaysLocation: async () => {
    set({ busy: true, error: null });
    try {
      if (!get().preferences.masterEnabled || !get().preferences.proximityEnabled) {
        set({ error: "Enable Notifications and Nearby detections before requesting background location." });
        return;
      }
      const locationPermission = await enableBackgroundLocationUpdates();
      set({ locationPermission });
      if (locationPermission !== "always") {
        set({ error: "Background access was not granted. Proximity alerts will work only while AgniVision.live is active." });
      }
      await get().syncRegistration();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Background location could not be enabled." });
    } finally {
      set({ busy: false });
    }
  },

  clearStoredLocation: async () => {
    set({ busy: true, error: null });
    try {
      const preferences = { ...get().preferences, proximityEnabled: false };
      set({ preferences });
      await persist({ preferences, watches: get().watches, inbox: get().inbox });
      await disableBackgroundLocationUpdates(true);
      await get().refreshPermissionStates();
      await get().syncRegistration();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Stored location could not be cleared." });
    } finally {
      set({ busy: false });
    }
  },

  syncRegistration: async () => {
    const { preferences, watches, locationPermission, notificationPermission } = get();
    try {
      const expoPushToken =
        preferences.masterEnabled && notificationPermission === "granted"
          ? await getExpoPushToken()
          : null;
      await syncNotificationDevice({
        expoPushToken,
        preferences,
        watches,
        locationPermission,
      });
      set({ error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Notification service is unavailable." });
    }
  },

  refreshInbox: async () => {
    try {
      const remote = await fetchNotificationInbox();
      const inbox = mergeInbox(remote, get().inbox);
      set({ inbox });
      await persist({ preferences: get().preferences, watches: get().watches, inbox });
    } catch {
      // The local inbox remains available while the backend is unreachable.
    }
  },

  ingestNotification: async (notification) => {
    const entry = parseInboxEntry(notification.request.content.data?.inboxEntry);
    if (!entry) {
      return;
    }
    const inbox = mergeInbox([entry], get().inbox);
    set({ inbox });
    await persist({ preferences: get().preferences, watches: get().watches, inbox });
  },

  markInboxRead: async () => {
    const readAtUtc = new Date().toISOString();
    const inbox = get().inbox.map((entry) => ({ ...entry, readAtUtc: entry.readAtUtc ?? readAtUtc }));
    set({ inbox });
    await persist({ preferences: get().preferences, watches: get().watches, inbox });
    await markNotificationInboxRead().catch(() => undefined);
  },
}));

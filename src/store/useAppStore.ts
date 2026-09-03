import * as Location from "expo-location";
import { create } from "zustand";

import { applyObservationRetentionPolicy } from "../config/dataPolicy";
import { useAdvisoryStore } from "./useAdvisoryStore";
import { fireRepository } from "../data/fireRepository";
import { INDIA_INITIAL_REGION } from "../map/clustering";
import { goBack, pushScreen, returnToMain } from "../navigation/rootNavigation";
import type { Destination } from "../types/destination";
import type { ConfidenceFilter, Coordinate, FireDetection, SensorFilter, TimeWindow } from "../types/fire";
import type { NotificationTarget } from "../types/notification";
import { formatLocationLabel } from "../utils/location";

export type AppTab = "home" | "map" | "activity" | "info";
export type DataStatus = "idle" | "loading" | "ready" | "refreshing" | "stale" | "error";
export type LocationStatus = "idle" | "loading" | "ready" | "denied" | "error";
type MapFocusTarget = { coordinate: Coordinate; zoom: number };

type AppState = {
  activeTab: AppTab;
  timeWindow: TimeWindow;
  sensorFilter: SensorFilter;
  confidenceFilter: ConfidenceFilter;
  detections: FireDetection[];
  dataStatus: DataStatus;
  dataError: string | null;
  lastFetchedAtUtc: string | null;
  selectedDetectionId: string | null;
  selectedDestination: Destination | null;
  userLocation: Coordinate | null;
  userLocationLabel: string | null;
  mapFocusTarget: MapFocusTarget | null;
  mapRegion: Coordinate & { latitudeDelta: number; longitudeDelta: number };
  locationStatus: LocationStatus;
  locationError: string | null;
  setActiveTab: (tab: AppTab) => void;
  openSearch: () => void;
  openDestination: (destination: Destination) => void;
  completeDestinationSearch: (destination: Destination) => void;
  openDetectionDetails: (detectionId: string) => void;
  openNotificationSettings: () => void;
  openNotificationInbox: () => void;
  openAppInfo: () => void;
  openNotificationTarget: (target: NotificationTarget) => void;
  closeOverlay: () => void;
  setTimeWindow: (timeWindow: TimeWindow) => void;
  setSensorFilter: (sensorFilter: SensorFilter) => void;
  setConfidenceFilter: (confidenceFilter: ConfidenceFilter) => void;
  selectDetection: (detectionId: string | null) => void;
  clearMapSelection: () => void;
  clearMapFocusTarget: () => void;
  showDetectionOnMap: (detectionId: string) => void;
  showDestinationOnMap: () => void;
  setMapRegion: (region: Coordinate & { latitudeDelta: number; longitudeDelta: number }) => void;
  refreshDetections: () => Promise<void>;
  syncCurrentLocation: () => Promise<void>;
  requestCurrentLocation: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "home",
  timeWindow: "24h",
  sensorFilter: "all",
  confidenceFilter: "all",
  detections: [],
  dataStatus: "idle",
  dataError: null,
  lastFetchedAtUtc: null,
  selectedDetectionId: null,
  selectedDestination: null,
  userLocation: null,
  userLocationLabel: null,
  mapFocusTarget: null,
  mapRegion: INDIA_INITIAL_REGION,
  locationStatus: "idle",
  locationError: null,

  setActiveTab: (activeTab) => {
    set({ activeTab });
    returnToMain();
  },
  openSearch: () => pushScreen("Search"),
  openDestination: (selectedDestination) => {
    set({ selectedDestination });
    pushScreen("Destination");
  },
  completeDestinationSearch: (selectedDestination) => {
    const openedFromMap = get().activeTab === "map";
    set({
      selectedDestination,
      activeTab: openedFromMap ? "map" : get().activeTab,
      mapFocusTarget: openedFromMap ? { coordinate: selectedDestination.coordinate, zoom: 10 } : null,
    });
    if (openedFromMap) returnToMain();
    else pushScreen("Destination");
  },
  openDetectionDetails: (selectedDetectionId) => {
    set({ selectedDetectionId });
    pushScreen("DetectionDetails");
  },
  openNotificationSettings: () => pushScreen("NotificationSettings"),
  openNotificationInbox: () => pushScreen("NotificationInbox"),
  openAppInfo: () => pushScreen("AppInfo"),
  openNotificationTarget: (target) => {
    if (target.advisoryId) {
      useAdvisoryStore.getState().openAdvisory(target.advisoryId);
      return;
    }
    const detectionIsLoaded = Boolean(target.detectionId && get().detections.some((detection) => detection.id === target.detectionId));
    set({
      activeTab: target.coordinate ? "map" : detectionIsLoaded ? get().activeTab : "activity",
      selectedDetectionId: target.detectionId ?? null,
      selectedDestination: null,
      mapFocusTarget: target.coordinate ? { coordinate: target.coordinate, zoom: 9 } : null,
    });
    if (target.coordinate) returnToMain();
    else if (detectionIsLoaded) pushScreen("DetectionDetails");
    else returnToMain();
  },
  closeOverlay: goBack,
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setSensorFilter: (sensorFilter) => set({ sensorFilter }),
  setConfidenceFilter: (confidenceFilter) => set({ confidenceFilter }),
  selectDetection: (selectedDetectionId) => set({ selectedDetectionId }),
  clearMapSelection: () => set({ selectedDetectionId: null, selectedDestination: null }),
  clearMapFocusTarget: () => set({ mapFocusTarget: null }),
  showDetectionOnMap: (selectedDetectionId) => {
    const detection = get().detections.find((item) => item.id === selectedDetectionId);
    if (!detection) return;
    set({
      activeTab: "map",
      selectedDestination: null,
      selectedDetectionId,
      mapFocusTarget: { coordinate: { latitude: detection.latitude, longitude: detection.longitude }, zoom: 10 },
    });
    returnToMain();
  },
  showDestinationOnMap: () => {
    const selectedDestination = get().selectedDestination;
    if (!selectedDestination) return;
    set({
      activeTab: "map",
      selectedDetectionId: null,
      mapFocusTarget: { coordinate: selectedDestination.coordinate, zoom: 10 },
    });
    returnToMain();
  },
  setMapRegion: (mapRegion) => set({ mapRegion }),

  refreshDetections: async () => {
    const { detections } = get();
    set({
      dataStatus: detections.length > 0 ? "refreshing" : "loading",
      dataError: null,
    });

    try {
      const response = await fireRepository.getRecentDetections();
      set({
        detections: applyObservationRetentionPolicy(response.detections),
        dataStatus: response.isStale ? "stale" : "ready",
        dataError: response.isStale ? "The latest update could not be retrieved." : null,
        lastFetchedAtUtc: response.fetchedAtUtc,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load satellite data.";
      set({
        dataStatus: detections.length > 0 ? "stale" : "error",
        dataError: message,
      });
    }
  },

  syncCurrentLocation: async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return;
    }

    const existingLocation = get().userLocation;
    set({ locationStatus: "loading", locationError: null });

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      let userLocationLabel: string | null = null;

      try {
        const [address] = await Location.reverseGeocodeAsync(userLocation);
        userLocationLabel = formatLocationLabel(address);
      } catch {
        // A readable address is optional; the verified coordinates remain usable.
      }

      set({
        userLocation,
        userLocationLabel,
        locationStatus: "ready",
        locationError: null,
      });
    } catch {
      set({
        locationStatus: existingLocation ? "ready" : "error",
        locationError: existingLocation
          ? "Your location could not be updated. Showing the last available position."
          : "Your current location could not be determined. Please try again.",
      });
    }
  },

  requestCurrentLocation: async () => {
    set({ locationStatus: "loading", locationError: null });
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      set({
        locationStatus: "denied",
        locationError: "Location permission was not granted. You can still explore the map manually.",
      });
      return;
    }

    await get().syncCurrentLocation();
  },
}));

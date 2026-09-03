import type { ExpoConfig } from "expo/config";

const androidMapsKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID;
const iosMapsKey = process.env.GOOGLE_MAPS_API_KEY_IOS;
const mapsConfigured = Boolean(androidMapsKey && iosMapsKey);
const mapsPlugin: NonNullable<ExpoConfig["plugins"]>[number] = mapsConfigured
  ? ["react-native-maps", { androidGoogleMapsApiKey: androidMapsKey, iosGoogleMapsApiKey: iosMapsKey }]
  : "react-native-maps";

const config: ExpoConfig = {
  name: "AgniVision.live",
  slug: "agnivision",
  version: "0.1.0",
  orientation: "default",
  userInterfaceStyle: "light",
  scheme: "agnivision",
  platforms: ["ios", "android"],
  plugins: [
    mapsPlugin,
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "AgniVision.live uses your location to show nearby satellite detections and enable proximity alerts you choose.",
        locationAlwaysAndWhenInUsePermission:
          "AgniVision.live uses a coarse background location to check for nearby satellite detections when proximity alerts are enabled.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "AgniVision.live accesses photos only when you choose to save an observation image.",
        savePhotosPermission: "AgniVision.live saves observation images to your photo gallery when you request it.",
        granularPermissions: ["photo"],
      },
    ],
    "expo-sharing",
    [
      "expo-notifications",
      {
        color: "#14532D",
        defaultChannel: "proximity",
        enableBackgroundRemoteNotifications: true,
      },
    ],
    "expo-secure-store",
    [
      "expo-screen-orientation",
      {
        initialOrientation: "PORTRAIT_UP",
      },
    ],
  ],
  ios: {
    bundleIdentifier: "live.agnivision.app",
    requireFullScreen: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "AgniVision.live uses your location to show nearby satellite detections and enable proximity alerts you choose.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "AgniVision.live uses a coarse background location to check for nearby satellite detections when proximity alerts are enabled.",
      UIBackgroundModes: ["location", "remote-notification"],
    },
  },
  android: {
    package: "live.agnivision.app",
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "POST_NOTIFICATIONS",
    ],
  },
  extra: {
    fireDataUrl: process.env.EXPO_PUBLIC_FIRE_DATA_URL,
    advisoriesApiUrl: process.env.EXPO_PUBLIC_ADVISORIES_API_URL,
    notificationApiUrl: process.env.EXPO_PUBLIC_NOTIFICATION_API_URL,
    placesApiUrl: process.env.EXPO_PUBLIC_PLACES_API_URL,
    detectionAreaApiUrl: process.env.EXPO_PUBLIC_DETECTION_AREA_API_URL,
    googleMapsConfigured: mapsConfigured,
    easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  },
};

export default config;

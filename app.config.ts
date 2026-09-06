import type { ExpoConfig } from "expo/config";

const androidMapsKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID;
const iosMapsKey = process.env.GOOGLE_MAPS_API_KEY_IOS;
const googleCredentials = [
  ["GOOGLE_MAPS_API_KEY_ANDROID", androidMapsKey],
  ["GOOGLE_MAPS_API_KEY_IOS", iosMapsKey],
  ["GOOGLE_PLACES_API_KEY", process.env.GOOGLE_PLACES_API_KEY],
  ["GOOGLE_GEOCODING_API_KEY", process.env.GOOGLE_GEOCODING_API_KEY],
] as const;
for (let left = 0; left < googleCredentials.length; left += 1) {
  for (let right = left + 1; right < googleCredentials.length; right += 1) {
    const [leftName, leftValue] = googleCredentials[left]!;
    const [rightName, rightValue] = googleCredentials[right]!;
    if (leftValue && rightValue && leftValue === rightValue) {
      throw new Error(`${leftName} and ${rightName} must use separate, platform-restricted credentials.`);
    }
  }
}
const mapsConfigured = Boolean(androidMapsKey && iosMapsKey);
const appIcon = "./public/Agnivision_App_Icon_Pack/expo/icon.png";
const androidAdaptiveIcon = "./public/Agnivision_App_Icon_Pack/expo/adaptive-icon-foreground.png";
// Native projects inject platform keys directly. Keeping keys in plugin options
// would also serialize the iOS key into Android's embedded Expo config.
const mapsPlugin: NonNullable<ExpoConfig["plugins"]>[number] = "react-native-maps";

const config: ExpoConfig = {
  name: "AgniVision",
  slug: "agnivision",
  version: "1.0.0",
  icon: appIcon,
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
    icon: appIcon,
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
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: androidAdaptiveIcon,
      backgroundColor: "#0D121C",
    },
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

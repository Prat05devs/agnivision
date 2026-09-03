import { Platform } from "react-native";
import Constants from "expo-constants";

export const googleMapsEnabled = Constants.expoConfig?.extra?.googleMapsConfigured === true;
export const useIosDevelopmentMapKit =
  __DEV__ && Platform.OS === "ios" && process.env.EXPO_PUBLIC_IOS_MAPKIT_PREVIEW === "true";

import { Platform, Share } from "react-native";

export type SaveObservationImageResult = "saved" | "permission-denied" | "native-module-unavailable";

export async function shareObservationImage(uri: string) {
  try {
    const Sharing = await import("expo-sharing");
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(uri, {
        dialogTitle: "Share AgniVision.live observation",
        mimeType: "image/png",
        UTI: "public.png",
      });
      return true;
    }
  } catch {
    // Expo Go may not bundle this optional module. iOS can use React Native's
    // native share sheet until the production binary is rebuilt with it.
  }

  if (Platform.OS === "ios") {
    await Share.share({
      title: "AgniVision.live observation",
      url: uri,
    });
    return true;
  }

  await Share.share({
    message: "AgniVision.live satellite observation image",
    title: "AgniVision.live observation",
  });
  return false;
}

export async function saveObservationImage(uri: string): Promise<SaveObservationImageResult> {
  let MediaLibrary: typeof import("expo-media-library/legacy");
  try {
    MediaLibrary = await import("expo-media-library/legacy");
  } catch {
    return "native-module-unavailable";
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
  if (!permission.granted) {
    return "permission-denied";
  }

  await MediaLibrary.saveToLibraryAsync(uri);
  return "saved";
}

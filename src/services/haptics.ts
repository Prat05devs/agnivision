import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

async function safelyPerform(feedback: () => Promise<void>) {
  try {
    await feedback();
  } catch {
    // Haptics are an enhancement and must never block the associated action.
  }
}

export function selectionHaptic() {
  return safelyPerform(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync(),
  );
}

export function successHaptic() {
  return safelyPerform(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function warningHaptic() {
  return safelyPerform(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_Off)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}

export function errorHaptic() {
  return safelyPerform(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
}

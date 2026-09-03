import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowHeader } from "../components/FlowHeader";
import { useAppStore } from "../store/useAppStore";
import { InfoScreen } from "./InfoScreen";

export function AppInfoScreen() {
  const insets = useSafeAreaInsets();
  const closeOverlay = useAppStore((state) => state.closeOverlay);

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="ABOUT & DATA" title="About AgniVision.live" onBack={closeOverlay} />
      <View style={[styles.content, { paddingBottom: Platform.OS === "android" ? insets.bottom : 0 }]}>
        <InfoScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { flex: 1 },
});

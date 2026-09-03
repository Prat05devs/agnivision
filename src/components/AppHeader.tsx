import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { selectionHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { AgniVisionBrand } from "./AgniVisionBrand";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const navigateHome = () => {
    if (activeTab === "home") return;
    void selectionHaptic();
    setActiveTab("home");
  };

  return (
    <View style={[styles.header, { paddingLeft: Math.max(20, insets.left + 20), paddingRight: Math.max(20, insets.right + 20), paddingTop: insets.top + 12 }]}> 
      <AgniVisionBrand onPress={navigateHome} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: "#F8F9FC",
    borderBottomColor: "#E8EBF1",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 12,
  },
});

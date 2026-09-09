import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { selectionHaptic } from "../services/haptics";
import type { AppTab } from "../store/useAppStore";
import { font } from "../theme/typography";

type TabBarProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: Array<{ id: AppTab; label: string; glyph: string }> = [
  { id: "map", label: "MAP", glyph: "⌖" },
  { id: "activity", label: "ACTIVITY", glyph: "≡" },
  { id: "info", label: "SETTINGS", glyph: "⚙︎" },
];

export function AppTabBar({ activeTab, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10, paddingLeft: Math.max(12, insets.left + 12), paddingRight: Math.max(12, insets.right + 12) }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label.charAt(0) + tab.label.slice(1).toLowerCase()}
            onPress={() => {
              if (!selected) {
                void selectionHaptic();
                onChange(tab.id);
              }
            }}
            style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}
          >
            <Text style={[styles.glyph, selected && styles.textSelected]}>{tab.glyph}</Text>
            <Text style={[styles.label, selected && styles.textSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#FBFCFF",
    borderTopColor: "#E5E8EE",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
  },
  tab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    gap: 3,
    paddingVertical: 6,
  },
  tabSelected: { backgroundColor: "#E2ECE5" },
  tabPressed: { opacity: 0.65 },
  glyph: { color: "#3F4942", fontSize: 20, ...font("800"), lineHeight: 22 },
  label: { color: "#3F4942", fontSize: 9, ...font("700"), letterSpacing: 0.5 },
  textSelected: { color: "#003E2C" },
});

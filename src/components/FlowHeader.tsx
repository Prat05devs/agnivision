import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FlowHeaderProps = {
  eyebrow: string;
  title: string;
  onBack: () => void;
};

export function FlowHeader({ eyebrow, title, onBack }: FlowHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingLeft: Math.max(16, insets.left + 16), paddingRight: Math.max(16, insets.right + 16), paddingTop: insets.top + 12 }]}> 
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", backgroundColor: "#F8F9FC", borderBottomColor: "#E8EBF1", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingBottom: 12 },
  backButton: { alignItems: "center", backgroundColor: "#EDF4EE", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  backGlyph: { color: "#185F35", fontSize: 34, fontWeight: "400", lineHeight: 36, marginTop: -4 },
  copy: { flex: 1, minWidth: 72 },
  eyebrow: { color: "#17633A", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#073B2A", fontSize: 21, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
});

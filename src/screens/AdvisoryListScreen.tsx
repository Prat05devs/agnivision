import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdvisoryCard } from "../components/AdvisoryCard";
import { FlowHeader } from "../components/FlowHeader";
import { useAppStore } from "../store/useAppStore";
import { useAdvisoryStore } from "../store/useAdvisoryStore";
import { advisoryFreshness } from "../utils/advisory";

export function AdvisoryListScreen() {
  const insets = useSafeAreaInsets(); const close = useAppStore((state) => state.closeOverlay); const advisories = useAdvisoryStore((state) => state.advisories); const open = useAdvisoryStore((state) => state.openAdvisory); const lastChecked = useAdvisoryStore((state) => state.lastCheckedAtUtc); const error = useAdvisoryStore((state) => state.error);
  return <View style={styles.screen}><FlowHeader eyebrow="NDMA SACHET" title="Official Advisories" onBack={close} /><ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + (Platform.OS === "android" ? insets.bottom : 0) }]}>{<Text style={styles.freshness}>{advisoryFreshness(lastChecked)} · {advisories.length} active relevant advisories</Text>}{error ? <Text style={styles.error}>{error}</Text> : null}{advisories.map((advisory) => <AdvisoryCard key={advisory.id} advisory={advisory} onPress={() => open(advisory.id)} />)}{advisories.length === 0 && !error ? <View style={styles.empty}><Text style={styles.emptyTitle}>No active official advisories for the selected area.</Text><Text style={styles.emptyBody}>This does not mean the area is safe. Follow official local guidance.</Text></View> : null}</ScrollView></View>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: "#F8F9FC", flex: 1 }, content: { alignSelf: "center", gap: 11, maxWidth: 760, padding: 18, width: "100%" }, freshness: { color: "#6C786F", fontSize: 11, fontWeight: "700" }, error: { backgroundColor: "#FFF4E3", borderRadius: 12, color: "#754E12", fontSize: 11, lineHeight: 16, padding: 12 }, empty: { backgroundColor: "#F0F4F1", borderRadius: 16, gap: 6, padding: 17 }, emptyTitle: { color: "#304338", fontSize: 14, fontWeight: "800" }, emptyBody: { color: "#69766E", fontSize: 12, lineHeight: 18 } });

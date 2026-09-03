import { Pressable, StyleSheet, Text, View } from "react-native";

import type { OfficialAdvisory } from "../types/advisory";
import { advisorySeverityColor, advisorySeverityLabel, formatAdvisoryTime } from "../utils/advisory";

export function AdvisoryCard({ advisory, onPress }: { advisory: OfficialAdvisory; onPress: () => void }) {
  const color = advisorySeverityColor[advisory.severity];
  const area = advisory.areaDescription || [advisory.district, advisory.state].filter(Boolean).join(", ") || "Area specified in official advisory";
  const timing = advisory.expiresAt ? `Until ${formatAdvisoryTime(advisory.expiresAt)}` : `Issued ${formatAdvisoryTime(advisory.issuedAt)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${advisory.event}: ${advisory.headline}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: `${color}0A`, borderColor: `${color}24`, shadowColor: color },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.severity}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.severityText, { color }]}>{advisorySeverityLabel[advisory.severity]}</Text></View>
        <Text style={styles.source}>NDMA SACHET</Text>
      </View>
      <Text style={styles.event}>{advisory.event}</Text>
      <Text numberOfLines={1} style={styles.area}>{area}</Text>
      <Text numberOfLines={2} style={styles.headline}>{advisory.headline}</Text>
      <View style={styles.bottomRow}><Text style={styles.time}>{timing}</Text><Text style={styles.openLabel}>View advisory</Text><Text style={styles.arrow}>›</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    gap: 7,
    padding: 16,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  severity: { alignItems: "center", flexDirection: "row", gap: 6 },
  dot: { borderRadius: 4, height: 7, width: 7 },
  severityText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  source: { color: "#7A857D", fontSize: 8, fontWeight: "800", letterSpacing: 0.7 },
  event: { color: "#1D3023", fontSize: 17, fontWeight: "800", letterSpacing: -0.25, lineHeight: 22 },
  area: { color: "#536158", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  headline: { color: "#56645B", fontSize: 12, lineHeight: 18 },
  bottomRow: { alignItems: "center", borderTopColor: "#EDF1EE", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginTop: 3, paddingTop: 10 },
  time: { color: "#707D74", flex: 1, fontSize: 10, fontWeight: "600" },
  openLabel: { color: "#17633A", fontSize: 10, fontWeight: "800" },
  arrow: { color: "#17633A", fontSize: 20, lineHeight: 20, marginLeft: 5 },
});

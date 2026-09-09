import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import type { FireDetection } from "../types/fire";
import { formatConfidence, formatObservationTime } from "../utils/fire";
import { intensityLabel } from "../utils/intensity";
import { font } from "../theme/typography";

type DetectionCardProps = {
  detection: FireDetection;
  distanceLabel?: string;
  onPress: () => void;
};

export function DetectionCard({ detection, distanceLabel, onPress }: DetectionCardProps) {
  const { label: areaLabel, isResolved } = useDetectionAreaLabel(detection);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${areaLabel}, satellite observation, ${intensityLabel(detection.intensityLevel)} intensity, ${formatConfidence(detection)}, observed ${formatObservationTime(detection.acquiredAtUtc)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>•</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.sensor}>Satellite observation</Text>
          <Text style={styles.time}>{formatObservationTime(detection.acquiredAtUtc)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.area}>{areaLabel}</Text>
        <Text style={styles.areaBasis}>{isResolved ? "Approximate locality around observation" : "Approximate nearest reference"}</Text>
        <Text style={styles.meta}>{formatConfidence(detection)}</Text>
        <Text style={styles.meta}>Map intensity: {intensityLabel(detection.intensityLevel)}</Text>
        <Text style={styles.meta}>
          {detection.latitude.toFixed(3)}, {detection.longitude.toFixed(3)}
          {distanceLabel ? `  ·  ${distanceLabel}` : ""}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7ECE8",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  pressed: { backgroundColor: "#F6FAF7" },
  icon: {
    alignItems: "center",
    backgroundColor: "#FEE9D8",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconText: { color: "#C8540A", fontSize: 30, lineHeight: 24 },
  body: { flex: 1, gap: 3 },
  row: { alignItems: "baseline", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  sensor: { color: "#17221A", fontSize: 13, ...font("800") },
  time: { color: "#5E6B62", fontSize: 11, ...font("600") },
  area: { color: "#1A4F2D", fontSize: 14, ...font("900"), lineHeight: 19, marginTop: 2 },
  areaBasis: { color: "#7A867E", fontSize: 8, ...font("800"), letterSpacing: 0.35, textTransform: "uppercase" },
  meta: { color: "#657168", fontSize: 12, lineHeight: 17 },
  chevron: { color: "#597060", fontSize: 26, ...font("400") },
});

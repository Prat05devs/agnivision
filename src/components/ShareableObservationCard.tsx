import { StyleSheet, Text, View } from "react-native";

import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import type { FireDetection } from "../types/fire";
import {
  formatConfidence,
  formatObservationTime,
  formatPublicObservationType,
} from "../utils/fire";
import { AgniVisionBrand } from "./AgniVisionBrand";

type ShareableObservationCardProps = {
  detection: FireDetection;
};

export function ShareableObservationCard({ detection }: ShareableObservationCardProps) {
  const { label: areaLabel } = useDetectionAreaLabel(detection);

  return (
    <View style={styles.card} collapsable={false}>
      <View style={styles.header}>
        <AgniVisionBrand compact inverse />
        <Text style={styles.source}>SATELLITE OBSERVATION</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.place}>{areaLabel}</Text>
      <Text style={styles.observed}>Observed {formatObservationTime(detection.acquiredAtUtc)}</Text>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{formatPublicObservationType(detection)}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{formatConfidence(detection)}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="LATITUDE" value={detection.latitude.toFixed(4)} />
        <Metric label="LONGITUDE" value={detection.longitude.toFixed(4)} />
        {detection.frpMw !== undefined ? <Metric label="FRP" value={`${detection.frpMw.toFixed(1)} MW`} /> : null}
      </View>

      <Text style={styles.disclaimer}>
        Satellite-derived thermal anomaly · Not a confirmed ground fire or emergency alert
      </Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#14532D", borderRadius: 22, gap: 13, padding: 20 },
  header: { alignItems: "center", flexDirection: "row", gap: 10 },
  source: { color: "#B9DCC1", flex: 1, fontSize: 8, fontWeight: "800", letterSpacing: 1, textAlign: "right" },
  divider: { backgroundColor: "rgba(255,255,255,0.15)", height: 1 },
  place: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", letterSpacing: -0.7, lineHeight: 31 },
  observed: { color: "#CDEAD4", fontSize: 12, fontWeight: "700" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7 },
  tagText: { color: "#EAF7ED", fontSize: 10, fontWeight: "800" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, flexGrow: 1, gap: 3, minWidth: "29%", padding: 10 },
  metricLabel: { color: "#9FD0AA", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  metricValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  disclaimer: { borderTopColor: "rgba(255,255,255,0.15)", borderTopWidth: 1, color: "#B9DCC1", fontSize: 9, lineHeight: 14, paddingTop: 11 },
});

import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import type { FireDetection } from "../types/fire";
import {
  formatConfidence,
  formatObservationTime,
  formatPublicObservationType,
  formatRelativeObservationTime,
} from "../utils/fire";

const ROTATION_INTERVAL_MS = 10_000;

type LiveObservationCardProps = {
  detections: FireDetection[];
  dataAvailable: boolean;
  onOpenDetection: (id: string) => void;
  onOpenMap: () => void;
};

export function LiveObservationCard({
  detections,
  dataAvailable,
  onOpenDetection,
  onOpenMap,
}: LiveObservationCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const currentDetection = detections.length > 0 ? detections[activeIndex % detections.length] ?? null : null;
  const newestDetectionId = detections[0]?.id;
  const { label: areaLabel, isResolved: areaResolved } = useDetectionAreaLabel(currentDetection);

  useEffect(() => {
    setActiveIndex(0);

    if (detections.length <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
      Animated.timing(transition, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        setActiveIndex((index) => (index + 1) % detections.length);
        transition.setValue(0);
        Animated.timing(transition, {
          duration: 260,
          toValue: 1,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      transition.stopAnimation();
    };
  }, [detections.length, newestDetectionId, transition]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.feedLabel}>
          <View style={styles.feedDot} />
          <Text style={styles.overline}>LIVE UPDATES</Text>
        </View>
        {currentDetection ? (
          <Text style={styles.position}>
            {(activeIndex % detections.length) + 1} / {detections.length}
          </Text>
        ) : null}
      </View>

      {currentDetection ? (
        <Animated.View
          style={{
            opacity: transition,
            transform: [
              {
                translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
              },
            ],
          }}
        >
          <Text style={styles.region}>{areaLabel}</Text>
          <Text style={styles.regionBasis}>{areaResolved ? "Approximate locality around observation" : "Nearest reference place · approximate distance"}</Text>
          <Text style={styles.relativeTime}>{formatRelativeObservationTime(currentDetection.acquiredAtUtc)}</Text>
          <Text style={styles.observationTime}>{formatObservationTime(currentDetection.acquiredAtUtc)}</Text>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatPublicObservationType(currentDetection)}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{formatConfidence(currentDetection)}</Text>
            </View>
          </View>

          <Text style={styles.coordinates}>
            {currentDetection.latitude.toFixed(3)}, {currentDetection.longitude.toFixed(3)}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenDetection(currentDetection.id)}
            style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}
          >
            <Text style={styles.detailButtonText}>View observation details</Text>
            <Text style={styles.detailButtonText}>→</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{dataAvailable ? "No detections in this window" : "Waiting for satellite data"}</Text>
          <Text style={styles.emptyCopy}>
            {dataAvailable
              ? "No recent satellite detections were returned for the selected period."
              : "Connect the AgniVision.live data service to start recent updates."}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.total}>{detections.length} recent detections loaded</Text>
        <Pressable accessibilityRole="button" onPress={onOpenMap}>
          <Text style={styles.mapLink}>India map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#14532D", borderRadius: 24, gap: 14, minHeight: 300, overflow: "hidden", padding: 22 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  feedLabel: { alignItems: "center", flexDirection: "row", gap: 7 },
  feedDot: { backgroundColor: "#72DB8B", borderRadius: 4, height: 8, width: 8 },
  overline: { color: "#B9E4C3", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  position: { color: "#A9DAB5", fontSize: 11, fontWeight: "800" },
  region: { color: "#FFFFFF", fontSize: 27, fontWeight: "800", letterSpacing: -0.7, lineHeight: 33 },
  regionBasis: { color: "#9FD0AA", fontSize: 9, fontWeight: "700", letterSpacing: 0.4, marginTop: 2, textTransform: "uppercase" },
  relativeTime: { color: "#D9F0DF", fontSize: 14, fontWeight: "800", marginTop: 7 },
  observationTime: { color: "#B9DCC1", fontSize: 11, marginTop: 3 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  tag: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  tagText: { color: "#E9F7EC", fontSize: 10, fontWeight: "700" },
  coordinates: { color: "#A9DAB5", fontSize: 10, fontWeight: "700", marginTop: 9 },
  detailButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#FFFFFF", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", marginTop: 15, padding: 13 },
  detailButtonText: { color: "#14532D", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  emptyState: { flex: 1, gap: 7, justifyContent: "center", minHeight: 150 },
  emptyTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  emptyCopy: { color: "#D9F0DF", fontSize: 13, lineHeight: 19 },
  footer: { alignItems: "center", borderTopColor: "rgba(255,255,255,0.14)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  total: { color: "#B9DCC1", flex: 1, fontSize: 10, fontWeight: "700" },
  mapLink: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", textDecorationLine: "underline" },
});

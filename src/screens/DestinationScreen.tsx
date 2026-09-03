import { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DataStatusBanner } from "../components/DataStatusBanner";
import { DetectionCard } from "../components/DetectionCard";
import { FlowHeader } from "../components/FlowHeader";
import { OfficialAdvisoriesSection } from "../components/OfficialAdvisoriesSection";
import { selectionHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { useAdvisoryStore } from "../store/useAdvisoryStore";
import { useNotificationStore } from "../store/useNotificationStore";
import {
  DESTINATION_ACTIVITY_LOOKBACK_DAYS,
  DESTINATION_ACTIVITY_RADIUS_KM,
  getNearbyDestinationDetections,
} from "../utils/destinationActivity";
import { formatDistanceKm } from "../utils/fire";
import { advisoriesForDestination } from "../utils/advisory";

export function DestinationScreen() {
  const insets = useSafeAreaInsets();
  const destination = useAppStore((state) => state.selectedDestination);
  const detections = useAppStore((state) => state.detections);
  const dataStatus = useAppStore((state) => state.dataStatus);
  const dataError = useAppStore((state) => state.dataError);
  const lastFetchedAtUtc = useAppStore((state) => state.lastFetchedAtUtc);
  const closeOverlay = useAppStore((state) => state.closeOverlay);
  const openDetectionDetails = useAppStore((state) => state.openDetectionDetails);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const showDestinationOnMap = useAppStore((state) => state.showDestinationOnMap);
  const watches = useNotificationStore((state) => state.watches);
  const toggleDestinationWatch = useNotificationStore((state) => state.toggleDestinationWatch);
  const notificationBusy = useNotificationStore((state) => state.busy);
  const advisories = useAdvisoryStore((state) => state.advisories);

  const nearbyDetections = useMemo(() => {
    if (!destination) {
      return [];
    }

    return getNearbyDestinationDetections(detections, destination);
  }, [destination, detections]);

  const navigateToTab = (tab: "home" | "map") => {
    void selectionHaptic();
    if (tab === "map") showDestinationOnMap();
    else setActiveTab(tab);
  };

  if (!destination) {
    return (
      <View style={styles.screen}>
        <FlowHeader eyebrow="DESTINATION" title="Destination" onBack={closeOverlay} />
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Choose a destination to continue.</Text>
          <Pressable onPress={() => navigateToTab("home")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const nearest = nearbyDetections[0];
  const hasData = dataStatus === "ready" || dataStatus === "stale";
  const isWatched = watches.some((watch) => watch.id === destination.id);
  const destinationAdvisories = advisoriesForDestination(advisories, destination);

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="DESTINATION" title={destination.name} onBack={closeOverlay} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { paddingBottom: 32 + (Platform.OS === "android" ? insets.bottom : 0) }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.region}>{destination.region}</Text>
        <DataStatusBanner status={dataStatus} fetchedAtUtc={lastFetchedAtUtc} error={dataError} />

        <View style={styles.summary}>
          <Text style={styles.summaryOverline}>RECENT SATELLITE ACTIVITY</Text>
          <Text style={styles.summaryCount}>{hasData ? nearbyDetections.length : "—"}</Text>
          <Text style={styles.summaryCopy}>
            {hasData
              ? `Satellite observations within ${DESTINATION_ACTIVITY_RADIUS_KM} km during the past ${DESTINATION_ACTIVITY_LOOKBACK_DAYS} days.`
              : "Connect the data service to calculate recent observations around this destination."}
          </Text>
          {nearest ? (
            <View style={styles.nearest}>
              <Text style={styles.nearestLabel}>NEAREST LOADED DETECTION</Text>
              <Text style={styles.nearestValue}>Approx. {formatDistanceKm(nearest.distanceKm)}</Text>
            </View>
          ) : null}
        </View>

        <Pressable onPress={() => navigateToTab("map")} style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}>
          <Text style={styles.mapButtonText}>View this area on the map</Text>
          <Text style={styles.mapButtonText}>→</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={notificationBusy}
          onPress={() => void toggleDestinationWatch(destination)}
          style={({ pressed }) => [styles.watchButton, isWatched && styles.watchButtonActive, pressed && styles.pressed]}
        >
          <Text style={[styles.watchButtonText, isWatched && styles.watchButtonTextActive]}>
            {isWatched ? "Notifications on for this place" : "Notify me about this place"}
          </Text>
          <Text style={[styles.watchButtonText, isWatched && styles.watchButtonTextActive]}>{isWatched ? "✓" : "+"}</Text>
        </Pressable>

        <OfficialAdvisoriesSection advisories={destinationAdvisories} emptyCopy={`No active official advisories found for ${destination.name}.`} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby observations</Text>
          {nearbyDetections.length > 0 ? <Text style={styles.radius}>newest first · within {DESTINATION_ACTIVITY_RADIUS_KM} km</Text> : null}
        </View>
        {nearbyDetections.map(({ detection, distanceKm }) => (
          <DetectionCard
            key={detection.id}
            detection={detection}
            distanceLabel={`Approx. ${formatDistanceKm(distanceKm)}`}
            onPress={() => openDetectionDetails(detection.id)}
          />
        ))}
        {hasData && nearbyDetections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No recent satellite observations found nearby.</Text>
            <Text style={styles.emptyText}>
              No thermal-anomaly observations were returned within {DESTINATION_ACTIVITY_RADIUS_KM} km during the past {DESTINATION_ACTIVITY_LOOKBACK_DAYS} days. This is not a safety clearance; check official local advisories before travel.
            </Text>
          </View>
        ) : null}

        <View style={styles.methodology}>
          <Text style={styles.methodologyTitle}>Distance method</Text>
          <Text style={styles.methodologyText}>Distances are approximate straight-line calculations from the selected destination. The list is always limited to the most recent five-day dataset, independent of the Home filter.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FBFCFB", flex: 1 },
  content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingTop: 10, width: "100%" },
  region: { color: "#617066", fontSize: 13, fontWeight: "600", marginTop: -8 },
  summary: { backgroundColor: "#14532D", borderRadius: 22, gap: 7, padding: 20 },
  summaryOverline: { color: "#B9E4C3", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  summaryCount: { color: "#FFFFFF", fontSize: 47, fontWeight: "800", letterSpacing: -1.4, lineHeight: 53 },
  summaryCopy: { color: "#D9F0DF", fontSize: 13, lineHeight: 19 },
  nearest: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, gap: 3, marginTop: 7, padding: 11 },
  nearestLabel: { color: "#B9E4C3", fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
  nearestValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  mapButton: { alignItems: "center", backgroundColor: "#E8F2EA", borderRadius: 13, flexDirection: "row", justifyContent: "space-between", padding: 15 },
  mapButtonText: { color: "#17633A", fontSize: 13, fontWeight: "800" },
  watchButton: { alignItems: "center", borderColor: "#B8C9BC", borderRadius: 13, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 15 },
  watchButtonActive: { backgroundColor: "#14532D", borderColor: "#14532D" },
  watchButtonText: { color: "#17633A", fontSize: 13, fontWeight: "800" },
  watchButtonTextActive: { color: "#FFFFFF" },
  pressed: { opacity: 0.72 },
  sectionHeader: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  sectionTitle: { color: "#1A2A1E", fontSize: 17, fontWeight: "800" },
  radius: { color: "#68766D", fontSize: 11, fontWeight: "700" },
  empty: { backgroundColor: "#EAF5EC", borderRadius: 16, gap: 5, padding: 16 },
  emptyTitle: { color: "#17633A", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  emptyText: { color: "#66736B", fontSize: 12, lineHeight: 17 },
  methodology: { borderTopColor: "#E1E7E2", borderTopWidth: 1, gap: 4, marginTop: 3, paddingTop: 15 },
  methodologyTitle: { color: "#3F5045", fontSize: 12, fontWeight: "800" },
  methodologyText: { color: "#67756B", fontSize: 12, lineHeight: 18 },
  missing: { alignItems: "flex-start", gap: 14, padding: 20 },
  missingTitle: { color: "#35463B", fontSize: 16, fontWeight: "800" },
  primaryButton: { backgroundColor: "#14532D", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});

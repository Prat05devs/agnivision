import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DataStatusBanner } from "../components/DataStatusBanner";
import { HomeMapPreview } from "../components/HomeMapPreview";
import { LiveObservationCard } from "../components/LiveObservationCard";
import { OfficialAdvisoriesSection } from "../components/OfficialAdvisoriesSection";
import { TimeWindowPicker } from "../components/TimeWindowPicker";
import { UttarakhandUpdatesSection } from "../components/UttarakhandUpdatesSection";
import { errorHaptic, selectionHaptic, successHaptic, warningHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { filterDetectionsByTime, formatDistanceKm, haversineDistanceKm } from "../utils/fire";
import { font } from "../theme/typography";

export function HomeScreen() {
  const detections = useAppStore((state) => state.detections);
  const dataStatus = useAppStore((state) => state.dataStatus);
  const dataError = useAppStore((state) => state.dataError);
  const lastFetchedAtUtc = useAppStore((state) => state.lastFetchedAtUtc);
  const timeWindow = useAppStore((state) => state.timeWindow);
  const userLocation = useAppStore((state) => state.userLocation);
  const userLocationLabel = useAppStore((state) => state.userLocationLabel);
  const locationStatus = useAppStore((state) => state.locationStatus);
  const locationError = useAppStore((state) => state.locationError);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const openSearch = useAppStore((state) => state.openSearch);
  const setTimeWindow = useAppStore((state) => state.setTimeWindow);
  const openDetectionDetails = useAppStore((state) => state.openDetectionDetails);
  const refreshDetections = useAppStore((state) => state.refreshDetections);
  const requestCurrentLocation = useAppStore((state) => state.requestCurrentLocation);

  const visibleDetections = useMemo(
    () =>
      [...filterDetectionsByTime(detections, timeWindow)].sort(
        (a, b) => Date.parse(b.acquiredAtUtc) - Date.parse(a.acquiredAtUtc),
      ),
    [detections, timeWindow],
  );

  const nearestDistance = useMemo(() => {
    if (!userLocation || visibleDetections.length === 0) {
      return null;
    }

    return Math.min(
      ...visibleDetections.map((detection) =>
        haversineDistanceKm(userLocation, {
          latitude: detection.latitude,
          longitude: detection.longitude,
        }),
      ),
    );
  }, [userLocation, visibleDetections]);

  const handleTimeWindowChange = (nextTimeWindow: typeof timeWindow) => {
    setTimeWindow(nextTimeWindow);
  };
  const handleLocationRequest = async () => {
    await requestCurrentLocation();
    const status = useAppStore.getState().locationStatus;
    await (status === "ready" ? successHaptic() : status === "denied" ? warningHaptic() : errorHaptic());
  };
  const openTab = (tab: "map" | "activity") => {
    void selectionHaptic();
    setActiveTab(tab);
  };
  const currentDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.contextHeader}>
        <Text style={styles.date}>{currentDate}</Text>
        <View style={styles.areaRow}>
          <View style={styles.areaCopy}>
            <Text style={styles.areaTitle}>Across India</Text>
            <Text style={styles.areaSubtitle}>Latest available satellite observations</Text>
          </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search a destination"
          onPress={openSearch}
          style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
        >
            <Text style={styles.searchText}>⌕</Text>
        </Pressable>
        </View>
      </View>

      <HomeMapPreview />

      <LiveObservationCard
        dataAvailable={dataStatus === "ready" || dataStatus === "stale"}
        detections={visibleDetections}
        onOpenDetection={openDetectionDetails}
        onOpenMap={() => openTab("map")}
      />

      <OfficialAdvisoriesSection />

      <DataStatusBanner status={dataStatus} fetchedAtUtc={lastFetchedAtUtc} error={dataError} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current situation</Text>
        <Text style={styles.sectionCopy}>Choose the recent period shown across the Home map and activity views.</Text>
        <TimeWindowPicker value={timeWindow} onChange={handleTimeWindowChange} />
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationCopy}>
          <View style={styles.locationTitleRow}>
            <Text style={styles.locationTitle}>
              {userLocation ? userLocationLabel ?? "Current location" : "Your location"}
            </Text>
            {userLocation ? <View style={styles.locationActiveDot} /> : null}
          </View>
          <Text style={styles.locationText}>
            {userLocation
              ? `${userLocationLabel ? "Approximate device location · " : ""}${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}${
                  nearestDistance === null
                    ? ""
                    : ` · Nearest loaded detection approx. ${formatDistanceKm(nearestDistance)} away.`
                }`
              : nearestDistance === null
              ? "Find the nearest available satellite detection."
              : `Nearest loaded detection: approx. ${formatDistanceKm(nearestDistance)} away.`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={locationStatus === "loading"}
          onPress={() => void handleLocationRequest()}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
        >
          <Text style={styles.locationButtonText}>
            {locationStatus === "loading" ? "Finding…" : userLocation ? "Update" : "Use location"}
          </Text>
        </Pressable>
      </View>
      {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}

      <UttarakhandUpdatesSection
        dataStatus={dataStatus}
        detections={visibleDetections}
        onOpenDetection={openDetectionDetails}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search a tourist destination"
        onPress={openSearch}
        style={({ pressed }) => [styles.tourismCard, pressed && styles.pressed]}
      >
        <View style={styles.tourismIcon}>
          <Text style={styles.tourismIconText}>⌖</Text>
        </View>
        <View style={styles.tourismCopy}>
          <Text style={styles.tourismTitle}>Planning a trip in India?</Text>
          <Text style={styles.tourismText}>Review five-day thermal activity near featured destinations.</Text>
        </View>
        <Text style={styles.tourismArrow}>→</Text>
      </Pressable>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>About this data</Text>
        <Text style={styles.noteText}>
          Satellite detections indicate thermal anomalies observed remotely. They are not necessarily confirmed ground incidents.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", backgroundColor: "#F8F9FC", gap: 18, maxWidth: 760, padding: 20, paddingBottom: 32, width: "100%" },
  contextHeader: { gap: 8 },
  date: { color: "#556159", fontSize: 11, ...font("800"), letterSpacing: 1.2 },
  areaRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  areaCopy: { flex: 1 },
  areaTitle: { color: "#101E31", fontSize: 27, ...font("800"), letterSpacing: -0.7 },
  areaSubtitle: { color: "#68736C", fontSize: 11, marginTop: 3 },
  searchButton: { alignItems: "center", backgroundColor: "#DDE9FA", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  searchText: { color: "#073B2A", fontSize: 24, ...font("800") },
  pressed: { opacity: 0.72 },
  tourismCard: { alignItems: "center", backgroundColor: "#FF8708", borderRadius: 17, flexDirection: "row", gap: 12, padding: 15 },
  tourismIcon: { alignItems: "center", backgroundColor: "rgba(148,69,0,0.16)", borderRadius: 13, height: 48, justifyContent: "center", width: 48 },
  tourismIconText: { color: "#6D3500", fontSize: 23, ...font("800") },
  tourismCopy: { flex: 1, gap: 3 },
  tourismTitle: { color: "#4E2B00", fontSize: 15, ...font("900") },
  tourismText: { color: "#563700", fontSize: 11, lineHeight: 16 },
  tourismArrow: { color: "#5C3300", fontSize: 24, ...font("800") },
  section: { gap: 10 },
  sectionTitle: { color: "#1A2A1E", fontSize: 17, ...font("800"), letterSpacing: -0.2 },
  sectionCopy: { color: "#66736B", fontSize: 12, lineHeight: 18 },
  locationCard: {
    alignItems: "center",
    backgroundColor: "#F0F6F2",
    borderRadius: 18,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  locationCopy: { flex: 1, gap: 4 },
  locationTitleRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  locationTitle: { color: "#1B3823", fontSize: 14, ...font("800") },
  locationActiveDot: { backgroundColor: "#22A35A", borderRadius: 4, height: 7, width: 7 },
  locationText: { color: "#587060", fontSize: 12, lineHeight: 17 },
  locationButton: { backgroundColor: "#14532D", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  locationButtonText: { color: "#FFFFFF", fontSize: 12, ...font("800") },
  locationError: { color: "#8B1E17", fontSize: 12, lineHeight: 18, marginTop: -10 },
  note: { borderTopColor: "#DFE6E0", borderTopWidth: 1, gap: 5, marginTop: 4, paddingTop: 16 },
  noteTitle: { color: "#324238", fontSize: 13, ...font("800") },
  noteText: { color: "#657168", fontSize: 12, lineHeight: 18 },
});

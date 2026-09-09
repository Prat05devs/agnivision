import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { DataStatusBanner } from "../components/DataStatusBanner";
import { FilterChipGroup } from "../components/FilterChipGroup";
import { TimeWindowPicker } from "../components/TimeWindowPicker";
import { MAX_RETAINED_OBSERVATIONS, OBSERVATION_RETENTION_DAYS } from "../config/dataPolicy";
import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import { errorHaptic, successHaptic, warningHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/tokens";
import type { FireDetection } from "../types/fire";
import {
  filterDetections,
  formatConfidence,
  formatDistanceKm,
  formatObservationTime,
  formatPublicObservationType,
  formatRelativeObservationTime,
  haversineDistanceKm,
  type ConfidenceFilter,
  type SensorFilter,
} from "../utils/fire";
import { intensityLabel } from "../utils/intensity";
import { font } from "../theme/typography";

const sensorOptions: Array<{ label: string; value: SensorFilter }> = [
  { label: "All observations", value: "all" },
  { label: "High resolution", value: "viirs" },
  { label: "Broad area", value: "modis" },
];

const confidenceOptions: Array<{ label: string; value: ConfidenceFilter }> = [
  { label: "All confidence", value: "all" },
  { label: "High", value: "high" },
  { label: "Nominal", value: "nominal" },
  { label: "Low", value: "low" },
];

const intensityColors = {
  1: colors.thermalLow,
  2: colors.thermalNominal,
  3: colors.thermalHigh,
} as const;

export function ActivityScreen() {
  const sensorFilter = useAppStore((state) => state.sensorFilter);
  const confidenceFilter = useAppStore((state) => state.confidenceFilter);
  const detections = useAppStore((state) => state.detections);
  const timeWindow = useAppStore((state) => state.timeWindow);
  const userLocation = useAppStore((state) => state.userLocation);
  const dataStatus = useAppStore((state) => state.dataStatus);
  const dataError = useAppStore((state) => state.dataError);
  const lastFetchedAtUtc = useAppStore((state) => state.lastFetchedAtUtc);
  const setTimeWindow = useAppStore((state) => state.setTimeWindow);
  const setSensorFilter = useAppStore((state) => state.setSensorFilter);
  const setConfidenceFilter = useAppStore((state) => state.setConfidenceFilter);
  const refreshDetections = useAppStore((state) => state.refreshDetections);
  const openDetectionDetails = useAppStore((state) => state.openDetectionDetails);
  const showDetectionOnMap = useAppStore((state) => state.showDetectionOnMap);

  const visibleDetections = useMemo(
    () =>
      filterDetections(detections, timeWindow, sensorFilter, confidenceFilter).sort(
        (a, b) => Date.parse(b.acquiredAtUtc) - Date.parse(a.acquiredAtUtc),
      ),
    [confidenceFilter, detections, sensorFilter, timeWindow],
  );

  const activeFilterCount = Number(sensorFilter !== "all") + Number(confidenceFilter !== "all");
  const isRefreshing = dataStatus === "loading" || dataStatus === "refreshing";
  const feedStatusColor = dataStatus === "ready" ? "#23854C" : dataStatus === "stale" ? "#BD7100" : dataStatus === "error" ? "#B42318" : "#2A6FAD";

  const handleRefresh = async () => {
    await refreshDetections();
    const status = useAppStore.getState().dataStatus;
    await (status === "ready" ? successHaptic() : status === "stale" ? warningHaptic() : errorHaptic());
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={visibleDetections}
        keyExtractor={(detection) => detection.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <View style={styles.feedLabelRow}>
                  <View style={[styles.liveDot, { backgroundColor: feedStatusColor }]} />
                  <Text style={styles.eyebrow}>NASA FIRMS FEED</Text>
                </View>
                <Text style={styles.title}>Recent activity</Text>
                <Text style={styles.subtitle}>A chronological log of the latest loaded satellite observations across India.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh satellite observations"
                disabled={isRefreshing}
                onPress={() => void handleRefresh()}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshPressed, isRefreshing && styles.refreshDisabled]}
              >
                <Text style={styles.refreshGlyph}>↻</Text>
                <Text style={styles.refreshText}>{isRefreshing ? "Updating" : "Refresh"}</Text>
              </Pressable>
            </View>

            <DataStatusBanner status={dataStatus} fetchedAtUtc={lastFetchedAtUtc} error={dataError} />

            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryNumber}>{visibleDetections.length.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>matching observations</Text>
              </View>
              <View style={styles.summaryMeta}>
                <Text style={styles.summaryMetaStrong}>Newest first</Text>
                <Text style={styles.summaryMetaText}>India · selected window</Text>
              </View>
            </View>

            <View style={styles.filterPanel}>
              <View style={styles.filterPanelHeader}>
                <View>
                  <Text style={styles.filterPanelTitle}>Refine the observation log</Text>
                  <Text style={styles.filterPanelStatus}>{activeFilterCount ? `${activeFilterCount} additional ${activeFilterCount === 1 ? "filter" : "filters"} active` : "Showing all sensor and confidence classes"}</Text>
                </View>
              </View>
              <View style={styles.filterDivider} />
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>TIME WINDOW</Text>
                <TimeWindowPicker value={timeWindow} onChange={setTimeWindow} />
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>OBSERVATION TYPE</Text>
                <FilterChipGroup accessibilityLabel="Filter by observation type" onChange={setSensorFilter} options={sensorOptions} value={sensorFilter} />
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>CONFIDENCE CLASS</Text>
                <FilterChipGroup accessibilityLabel="Filter by confidence class" onChange={setConfidenceFilter} options={confidenceOptions} value={confidenceFilter} />
              </View>
            </View>

            <View style={styles.logHeading}>
              <Text style={styles.logTitle}>Observation log</Text>
              <Text style={styles.logContext}>Tap an entry for source details</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const previous = index > 0 ? visibleDetections[index - 1] : undefined;
          const showDay = !previous || activityDayKey(previous.acquiredAtUtc) !== activityDayKey(item.acquiredAtUtc);
          const distanceLabel = userLocation
            ? `Approx. ${formatDistanceKm(haversineDistanceKm(userLocation, { latitude: item.latitude, longitude: item.longitude }))}`
            : undefined;

          return (
            <View>
              {showDay ? <Text style={[styles.dayLabel, index > 0 && styles.dayLabelSpaced]}>{activityDayLabel(item.acquiredAtUtc)}</Text> : null}
              <ActivityObservationRow
                detection={item}
                distanceLabel={distanceLabel}
                isLast={index === visibleDetections.length - 1}
                onMap={() => showDetectionOnMap(item.id)}
                onOpen={() => openDetectionDetails(item.id)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          dataStatus === "ready" ? (
            <View style={styles.empty}>
              <View style={styles.emptySignal} />
              <Text style={styles.emptyEyebrow}>NO MATCHING OBSERVATIONS</Text>
              <Text style={styles.emptyTitle}>Nothing was returned for these filters.</Text>
              <Text style={styles.emptyText}>Try a wider time window or another confidence class. This is not a statement about confirmed fire activity.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          visibleDetections.length > 0 ? (
            <Text style={styles.retentionNote}>Temporary in-memory feed · up to {OBSERVATION_RETENTION_DAYS} days or {MAX_RETAINED_OBSERVATIONS.toLocaleString()} newest observations</Text>
          ) : null
        }
      />
    </View>
  );
}

function ActivityObservationRow({ detection, distanceLabel, isLast, onMap, onOpen }: { detection: FireDetection; distanceLabel?: string; isLast: boolean; onMap: () => void; onOpen: () => void }) {
  const { label: areaLabel, isResolved } = useDetectionAreaLabel(detection);
  const signalColor = intensityColors[detection.intensityLevel];

  return (
    <View style={styles.observationRow}>
      <View style={styles.timelineColumn}>
        <View style={[styles.timelineHalo, { borderColor: `${signalColor}35` }]}>
          <View style={[styles.timelineCore, { backgroundColor: signalColor }]} />
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.observationBody}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${areaLabel}, ${formatConfidence(detection)}, observed ${formatObservationTime(detection.acquiredAtUtc)}`} onPress={onOpen} style={({ pressed }) => [styles.observationMain, pressed && styles.observationPressed]}>
          <View style={styles.observationTopRow}>
            <Text style={styles.relativeTime}>{formatRelativeObservationTime(detection.acquiredAtUtc)}</Text>
            <Text style={styles.provider}>NASA FIRMS</Text>
          </View>
          <Text numberOfLines={2} style={styles.areaName}>{areaLabel}</Text>
          <Text style={styles.areaBasis}>{isResolved ? "Approximate locality around observation" : "Approximate nearest reference"}</Text>
          <Text style={styles.observationType}>{formatPublicObservationType(detection)} · {formatConfidence(detection)}</Text>
          <Text style={styles.technicalLine}>Map intensity {intensityLabel(detection.intensityLevel)} · {detection.latitude.toFixed(3)}, {detection.longitude.toFixed(3)}{distanceLabel ? ` · ${distanceLabel}` : ""}</Text>
        </Pressable>
        <View style={styles.rowActions}>
          <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.textAction, pressed && styles.actionPressed]}>
            <Text style={styles.detailsText}>Observation details</Text><Text style={styles.actionArrow}>›</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable accessibilityRole="button" accessibilityLabel="Show this satellite observation on the map" onPress={onMap} style={({ pressed }) => [styles.mapAction, pressed && styles.actionPressed]}>
            <Text style={styles.mapActionText}>Show on map</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function activityDayKey(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toDateString();
}

function activityDayLabel(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", weekday: "long" }).format(date);
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { alignSelf: "center", maxWidth: 760, paddingBottom: 48, paddingHorizontal: 20, paddingTop: 22, width: "100%" },
  listHeader: { gap: 18, marginBottom: 4 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 14, justifyContent: "space-between" },
  headerCopy: { flex: 1 },
  feedLabelRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  liveDot: { borderRadius: 4, height: 7, width: 7 },
  eyebrow: { color: "#17633A", fontSize: 10, ...font("900"), letterSpacing: 1.3 },
  title: { color: "#17271B", fontSize: 30, ...font("800"), letterSpacing: -0.9, lineHeight: 36, marginTop: 5 },
  subtitle: { color: "#657168", fontSize: 12, lineHeight: 18, marginTop: 5, maxWidth: 440 },
  refreshButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DDE6DF", borderRadius: 14, borderWidth: 1, minWidth: 68, paddingHorizontal: 10, paddingVertical: 8 },
  refreshPressed: { backgroundColor: "#EDF5EF", transform: [{ scale: 0.98 }] },
  refreshDisabled: { opacity: 0.55 },
  refreshGlyph: { color: "#17633A", fontSize: 20, ...font("700"), lineHeight: 20 },
  refreshText: { color: "#17633A", fontSize: 9, ...font("800"), marginTop: 3 },
  summaryRow: { alignItems: "flex-end", borderBottomColor: "#E3E9E4", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingBottom: 17 },
  summaryNumber: { color: "#173D25", fontSize: 34, ...font("800"), letterSpacing: -1.2, lineHeight: 38 },
  summaryLabel: { color: "#58665D", fontSize: 11, ...font("700") },
  summaryMeta: { alignItems: "flex-end", gap: 3, paddingBottom: 2 },
  summaryMetaStrong: { color: "#253A2B", fontSize: 11, ...font("800") },
  summaryMetaText: { color: "#7A857D", fontSize: 9 },
  filterPanel: { backgroundColor: "#FFFFFF", borderColor: "#E0E7E1", borderRadius: 20, borderWidth: 1, gap: 15, padding: 17 },
  filterPanelHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  filterPanelTitle: { color: "#203326", fontSize: 14, ...font("900") },
  filterPanelStatus: { color: "#748078", fontSize: 10, marginTop: 3 },
  filterDivider: { backgroundColor: "#E9EEEA", height: StyleSheet.hairlineWidth },
  filterSection: { gap: 9 },
  filterLabel: { color: "#77837B", fontSize: 8, ...font("900"), letterSpacing: 0.9 },
  logHeading: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", paddingTop: 3 },
  logTitle: { color: "#1D3023", fontSize: 18, ...font("900"), letterSpacing: -0.25 },
  logContext: { color: "#7A857D", fontSize: 9 },
  dayLabel: { color: "#58665D", fontSize: 11, ...font("900"), letterSpacing: 0.2, paddingBottom: 12, paddingLeft: 34, paddingTop: 12 },
  dayLabelSpaced: { paddingTop: 22 },
  observationRow: { alignItems: "stretch", flexDirection: "row" },
  timelineColumn: { alignItems: "center", width: 26 },
  timelineHalo: { alignItems: "center", backgroundColor: "#F8F9FC", borderRadius: 9, borderWidth: 2, height: 18, justifyContent: "center", marginTop: 4, width: 18, zIndex: 1 },
  timelineCore: { borderRadius: 4, height: 7, width: 7 },
  timelineLine: { backgroundColor: "#DDE5DF", bottom: -1, position: "absolute", top: 21, width: 1 },
  observationBody: { borderBottomColor: "#E1E7E2", borderBottomWidth: StyleSheet.hairlineWidth, flex: 1, paddingBottom: 16 },
  observationMain: { borderRadius: 10, gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  observationPressed: { backgroundColor: "#EEF4EF" },
  observationTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  relativeTime: { color: "#17633A", fontSize: 10, ...font("800") },
  provider: { color: "#879189", fontSize: 8, ...font("900"), letterSpacing: 0.7 },
  areaName: { color: "#1A3221", fontSize: 16, ...font("900"), letterSpacing: -0.25, lineHeight: 21, marginTop: 2 },
  areaBasis: { color: "#89928C", fontSize: 7, ...font("800"), letterSpacing: 0.55, textTransform: "uppercase" },
  observationType: { color: "#506057", fontSize: 11, ...font("700"), lineHeight: 16, marginTop: 4 },
  technicalLine: { color: "#748078", fontSize: 10, lineHeight: 15 },
  rowActions: { alignItems: "center", flexDirection: "row", marginTop: 8, paddingLeft: 8 },
  textAction: { alignItems: "center", flex: 1, flexDirection: "row", gap: 4, minHeight: 34 },
  detailsText: { color: "#17633A", fontSize: 11, ...font("800") },
  actionArrow: { color: "#17633A", fontSize: 18, lineHeight: 18 },
  actionDivider: { backgroundColor: "#DFE6E0", height: 18, width: StyleSheet.hairlineWidth },
  mapAction: { alignItems: "flex-end", justifyContent: "center", minHeight: 34, paddingLeft: 16 },
  mapActionText: { color: "#51675A", fontSize: 11, ...font("800") },
  actionPressed: { opacity: 0.55 },
  empty: { alignItems: "flex-start", backgroundColor: "#F0F5F1", borderColor: "#DEE7E0", borderRadius: 18, borderWidth: 1, gap: 7, marginLeft: 26, marginTop: 12, padding: 20 },
  emptySignal: { backgroundColor: "#91A097", borderRadius: 5, height: 9, width: 9 },
  emptyEyebrow: { color: "#738078", fontSize: 8, ...font("900"), letterSpacing: 0.9 },
  emptyTitle: { color: "#2D4133", fontSize: 16, ...font("900"), lineHeight: 22 },
  emptyText: { color: "#66736B", fontSize: 12, lineHeight: 18 },
  retentionNote: { color: "#7B867E", fontSize: 9, lineHeight: 14, paddingLeft: 34, paddingTop: 20 },
});

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type MapPressEvent } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DataStatusBanner } from "../components/DataStatusBanner";
import { FireMapMarker } from "../components/FireMapMarker";
import { ThermalHeatLayer } from "../components/ThermalHeatLayer";
import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import { clusterDetections, INDIA_INITIAL_REGION, isCoordinateInIndiaScope, type ClusterNode, type MapRegion, zoomFromLongitudeDelta } from "../map/clustering";
import { AGNIVISION_GOOGLE_MAP_STYLE } from "../map/googleMapStyle";
import { googleMapsEnabled, useIosDevelopmentMapKit } from "../map/provider";
import { errorHaptic, selectionHaptic, successHaptic, warningHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { useAdvisoryStore } from "../store/useAdvisoryStore";
import { colors } from "../theme/tokens";
import type { ConfidenceFilter, FireDetection, SensorFilter, TimeWindow } from "../types/fire";
import { filterDetections, formatConfidence, formatDistanceKm, formatObservationTime, haversineDistanceKm } from "../utils/fire";
import { intensityLabel } from "../utils/intensity";

const timeOptions: Array<{ label: string; value: TimeWindow }> = [{ label: "24h", value: "24h" }, { label: "3 days", value: "3d" }, { label: "5 days", value: "5d" }];
const sensorOptions: Array<{ label: string; value: SensorFilter }> = [{ label: "All observations", value: "all" }, { label: "High resolution", value: "viirs" }, { label: "Broad area", value: "modis" }];
const confidenceOptions: Array<{ label: string; value: ConfidenceFilter }> = [{ label: "All confidence", value: "all" }, { label: "High", value: "high" }, { label: "Nominal", value: "nominal" }, { label: "Low", value: "low" }];

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const clusterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadSlow, setMapLoadSlow] = useState(false);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const useSideSheet = isLandscape && width >= 900;
  const sideSheetWidth = Math.min(380, width - insets.left - insets.right - 32);
  const detections = useAppStore((state) => state.detections);
  const timeWindow = useAppStore((state) => state.timeWindow);
  const sensorFilter = useAppStore((state) => state.sensorFilter);
  const confidenceFilter = useAppStore((state) => state.confidenceFilter);
  const dataStatus = useAppStore((state) => state.dataStatus);
  const dataError = useAppStore((state) => state.dataError);
  const lastFetchedAtUtc = useAppStore((state) => state.lastFetchedAtUtc);
  const selectedDetectionId = useAppStore((state) => state.selectedDetectionId);
  const selectedDestination = useAppStore((state) => state.selectedDestination);
  const userLocation = useAppStore((state) => state.userLocation);
  const userLocationLabel = useAppStore((state) => state.userLocationLabel);
  const locationStatus = useAppStore((state) => state.locationStatus);
  const locationError = useAppStore((state) => state.locationError);
  const mapFocusTarget = useAppStore((state) => state.mapFocusTarget);
  const mapRegion = useAppStore((state) => state.mapRegion);
  const setMapRegion = useAppStore((state) => state.setMapRegion);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setTimeWindow = useAppStore((state) => state.setTimeWindow);
  const setSensorFilter = useAppStore((state) => state.setSensorFilter);
  const setConfidenceFilter = useAppStore((state) => state.setConfidenceFilter);
  const selectDetection = useAppStore((state) => state.selectDetection);
  const clearMapSelection = useAppStore((state) => state.clearMapSelection);
  const clearMapFocusTarget = useAppStore((state) => state.clearMapFocusTarget);
  const openSearch = useAppStore((state) => state.openSearch);
  const openDetectionDetails = useAppStore((state) => state.openDetectionDetails);
  const refreshDetections = useAppStore((state) => state.refreshDetections);
  const requestCurrentLocation = useAppStore((state) => state.requestCurrentLocation);
  const advisories = useAdvisoryStore((state) => state.advisories);
  const openAdvisoryList = useAdvisoryStore((state) => state.openList);

  const filteredDetections = useMemo(
    () => filterDetections(detections, timeWindow, sensorFilter, confidenceFilter).filter((detection) =>
      isCoordinateInIndiaScope({ latitude: detection.latitude, longitude: detection.longitude })),
    [confidenceFilter, detections, sensorFilter, timeWindow],
  );
  const nodes = useMemo(() => clusterDetections(filteredDetections, mapRegion), [filteredDetections, mapRegion]);
  const detectionsById = useMemo(() => new Map(detections.map((detection) => [detection.id, detection])), [detections]);
  const zoom = zoomFromLongitudeDelta(mapRegion.longitudeDelta);
  const selectedDetection = selectedDetectionId ? detectionsById.get(selectedDetectionId) ?? null : null;
  const destinationSituation = useMemo(() => {
    if (!selectedDestination) return null;
    const matches = detections
      .map((detection) => ({ detection, distanceKm: haversineDistanceKm(selectedDestination.coordinate, { latitude: detection.latitude, longitude: detection.longitude }) }))
      .filter(({ distanceKm }) => distanceKm <= 25)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    const latest = matches.reduce<typeof matches[number] | undefined>((newest, match) =>
      !newest || Date.parse(match.detection.acquiredAtUtc) > Date.parse(newest.detection.acquiredAtUtc) ? match : newest, undefined);
    return { count: matches.length, latest, nearest: matches[0] };
  }, [detections, selectedDestination]);

  useEffect(() => () => {
    if (clusterTimer.current) clearTimeout(clusterTimer.current);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapFocusTarget) return;
    mapRef.current?.animateCamera({ center: mapFocusTarget.coordinate, zoom: mapFocusTarget.zoom }, { duration: 450 });
    clearMapFocusTarget();
  }, [clearMapFocusTarget, mapFocusTarget, mapReady]);

  useEffect(() => {
    if (mapReady) return;
    const timeout = setTimeout(() => setMapLoadSlow(true), 10_000);
    return () => clearTimeout(timeout);
  }, [mapInstanceKey, mapReady]);

  const handleRegionChange = (region: MapRegion) => {
    if (clusterTimer.current) clearTimeout(clusterTimer.current);
    clusterTimer.current = setTimeout(() => setMapRegion(region), 160);
  };

  const handleRefresh = async () => {
    await refreshDetections();
    const status = useAppStore.getState().dataStatus;
    await (status === "ready" ? successHaptic() : status === "stale" ? warningHaptic() : errorHaptic());
  };

  const handleLocationRequest = async () => {
    await requestCurrentLocation();
    const state = useAppStore.getState();
    const status = state.locationStatus;
    if (status === "ready" && state.userLocation) {
      mapRef.current?.animateCamera({ center: state.userLocation, zoom: 9 }, { duration: 450 });
    }
    await (status === "ready" ? successHaptic() : status === "denied" ? warningHaptic() : errorHaptic());
  };

  const retryMap = () => {
    setMapReady(false);
    setMapLoadSlow(false);
    setMapInstanceKey((current) => current + 1);
  };

  const selectMapDetection = (detection: FireDetection) => {
    void selectionHaptic();
    selectDetection(detection.id);
    mapRef.current?.animateCamera({
      center: { latitude: detection.latitude - mapRegion.latitudeDelta * 0.16, longitude: detection.longitude },
      zoom: Math.max(zoom, 10),
    }, { duration: 380 });
  };

  const openDensityCluster = (cluster: ClusterNode) => {
    void selectionHaptic();
    const coordinates = cluster.memberIds.flatMap((id) => {
      const detection = detectionsById.get(id);
      return detection ? [{ latitude: detection.latitude, longitude: detection.longitude }] : [];
    });
    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, { animated: true, edgePadding: { top: 110, right: 55, bottom: 180, left: 55 } });
    }
  };

  const handleMapPress = ({ nativeEvent }: MapPressEvent) => {
    clearMapSelection();

    // Preserve the old tap-to-drill-down interaction without displaying a count
    // badge. A tap close to a visible density cluster fits that cluster's points.
    const latitudeRadius = Math.max(mapRegion.latitudeDelta * 0.08, 0.025);
    const longitudeRadius = Math.max(mapRegion.longitudeDelta * 0.08, 0.025);
    const nearestCluster = nodes
      .flatMap((node) => node.kind === "cluster" ? [node.cluster] : [])
      .map((cluster) => ({
        cluster,
        distance: Math.hypot(
          (cluster.centroid.latitude - nativeEvent.coordinate.latitude) / latitudeRadius,
          (cluster.centroid.longitude - nativeEvent.coordinate.longitude) / longitudeRadius,
        ),
      }))
      .filter(({ distance }) => distance <= 1)
      .sort((left, right) => left.distance - right.distance)[0]?.cluster;

    if (nearestCluster) openDensityCluster(nearestCluster);
  };

  if (!googleMapsEnabled && !useIosDevelopmentMapKit) return <MapSetupState onOpenSearch={openSearch} />;

  const sheetVisible = Boolean(selectedDetection || selectedDestination);
  return (
    <View style={styles.screen}>
      <MapView
        key={`map:${mapInstanceKey}`}
        ref={mapRef}
        provider={useIosDevelopmentMapKit ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        customMapStyle={useIosDevelopmentMapKit ? undefined : AGNIVISION_GOOGLE_MAP_STYLE}
        initialRegion={mapRegion}
        onMapReady={() => {
          setMapReady(true);
          setMapLoadSlow(false);
        }}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        rotateEnabled
        showsCompass
        showsMyLocationButton={false}
        style={StyleSheet.absoluteFill}
      >
        {!useIosDevelopmentMapKit ? <ThermalHeatLayer detections={filteredDetections} /> : null}
        {nodes.map((node) => {
          // Regional clusters are expressed by the continuous heat surface. Only
          // individual observations appear once the user reaches a close zoom.
          if (node.kind === "cluster") return null;
          const selected = node.detection.id === selectedDetectionId;
          return (
            <Marker anchor={{ x: 0.5, y: 1 }} key={`${node.detection.id}:${selected}`} coordinate={{ latitude: node.detection.latitude, longitude: node.detection.longitude }} onPress={() => selectMapDetection(node.detection)} stopPropagation tracksViewChanges={false} accessibilityLabel={`Satellite detection, ${intensityLabel(node.detection.intensityLevel)} intensity`}>
              <FireMapMarker selected={selected} />
            </Marker>
          );
        })}
        {selectedDestination ? (
          <>
            <Circle center={selectedDestination.coordinate} radius={25_000} fillColor="rgba(37,99,235,0.07)" strokeColor="rgba(37,99,235,0.35)" strokeWidth={1} />
            <Marker coordinate={selectedDestination.coordinate} accessibilityLabel={`Destination: ${selectedDestination.name}`} tracksViewChanges={false}><DestinationSignal /></Marker>
          </>
        ) : null}
        {userLocation ? <Marker coordinate={userLocation} title={userLocationLabel ?? "Your location"} tracksViewChanges={false}><CurrentLocationSignal /></Marker> : null}
      </MapView>

      <View style={[styles.topOverlay, { left: insets.left + 14, right: insets.right + 14 }, isLandscape && [styles.topOverlayLandscape, { width: Math.min(400, width - insets.left - insets.right - 28) }]]} pointerEvents="box-none">
        {useIosDevelopmentMapKit ? <View accessibilityRole="text" style={styles.previewBanner}><Text style={styles.previewBannerText}>LIMITED MAP PREVIEW</Text></View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Search a destination in India" onPress={openSearch} style={styles.searchControl}>
          <Text style={styles.searchGlyph}>⌕</Text><Text style={styles.searchText}>Search a city or destination</Text><Text style={styles.searchArrow}>›</Text>
        </Pressable>
        <MapFilters timeWindow={timeWindow} sensorFilter={sensorFilter} confidenceFilter={confidenceFilter} onTime={setTimeWindow} onSensor={setSensorFilter} onConfidence={setConfidenceFilter} />
        <DataStatusBanner status={dataStatus} fetchedAtUtc={lastFetchedAtUtc} error={dataError} />
        {advisories.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${advisories.length} official advisories`} onPress={openAdvisoryList} style={styles.advisoryIndicator}><View style={styles.advisoryDot} /><Text style={styles.advisoryIndicatorText}>{advisories.length} Official {advisories.length === 1 ? "Advisory" : "Advisories"}</Text><Text style={styles.advisoryArrow}>›</Text></Pressable> : null}
        {locationError ? <View accessibilityRole="alert" style={styles.locationNotice}><Text style={styles.locationNoticeText}>{locationError}</Text></View> : null}
        {!sheetVisible && nodes.length === 0 && (dataStatus === "ready" || dataStatus === "stale") ? <View style={styles.mapHint}><Text style={styles.mapHintTitle}>No recent satellite detections in this map area.</Text><Text style={styles.mapHintText}>Time range: {timeOptions.find((option) => option.value === timeWindow)?.label ?? timeWindow}. This is not a statement about confirmed fire activity.</Text></View> : null}
      </View>

      {!mapReady ? <View accessibilityRole={mapLoadSlow ? "alert" : undefined} pointerEvents={mapLoadSlow ? "auto" : "none"} style={styles.mapLoading}><View style={styles.mapLoadingCard}><Text style={styles.mapLoadingTitle}>{mapLoadSlow ? "The map is taking longer than expected." : "Loading map…"}</Text>{mapLoadSlow ? <><Text style={styles.mapLoadingCopy}>Check the connection, then retry. Your filters and camera state are preserved.</Text><Pressable accessibilityRole="button" onPress={retryMap} style={styles.mapRetry}><Text style={styles.mapRetryText}>Retry map</Text></Pressable></> : null}</View></View> : null}

      <View style={[styles.legend, { bottom: sheetVisible && !useSideSheet ? 300 : 24, left: insets.left + 14 }]} pointerEvents="box-none">
        {legendExpanded ? <View style={styles.legendCard}><Text style={styles.legendTitle}>OBSERVATION DENSITY</Text><LegendRow color="#38C86B" label="Lower density" /><LegendRow color="#F2DC45" label="Moderate density" /><LegendRow color="#FF8A20" label="Elevated density" /><LegendRow color="#D92D20" label="Highest density" /><Text style={styles.legendNote}>Colors compare the concentration of filtered satellite observations. Red marks the densest areas—not a confirmed fire boundary.</Text></View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: legendExpanded }} accessibilityLabel={`${legendExpanded ? "Hide" : "Show"} observation density guide`} onPress={() => setLegendExpanded((expanded) => !expanded)} style={styles.legendButton}><Text style={styles.legendButtonText}>{legendExpanded ? "HIDE GUIDE" : "DENSITY GUIDE"}</Text></Pressable>
      </View>

      <View style={[styles.actions, { bottom: sheetVisible && !useSideSheet ? 300 : 24, right: insets.right + 14 + (sheetVisible && useSideSheet ? sideSheetWidth + 16 : 0) }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="View detections as a list" onPress={() => setActiveTab("activity")} style={styles.compactAction}><Text style={styles.compactActionText}>LIST</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom to India" onPress={() => mapRef.current?.animateToRegion(INDIA_INITIAL_REGION, 450)} style={styles.compactAction}><Text style={styles.compactActionText}>INDIA</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh satellite detections" onPress={() => void handleRefresh()} style={styles.roundAction}><Text style={styles.roundActionText}>↻</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to current location" onPress={() => void handleLocationRequest()} style={styles.locationAction}><Text style={styles.locationActionText}>{locationStatus === "loading" ? "…" : "◎"}</Text></Pressable>
      </View>

      {selectedDetection ? (
        <DetectionSheet detection={selectedDetection} insets={insets} useSideSheet={useSideSheet} sideSheetWidth={sideSheetWidth} onClose={() => selectDetection(null)} onDetails={() => openDetectionDetails(selectedDetection.id)} />
      ) : selectedDestination && destinationSituation ? (
        <DestinationSheet destination={selectedDestination} count={destinationSituation.count} nearestKm={destinationSituation.nearest?.distanceKm} latestAtUtc={destinationSituation.latest?.detection.acquiredAtUtc} insets={insets} useSideSheet={useSideSheet} sideSheetWidth={sideSheetWidth} onClose={clearMapSelection} onViewNearest={destinationSituation.nearest ? () => selectMapDetection(destinationSituation.nearest!.detection) : undefined} />
      ) : null}
    </View>
  );
}

function DestinationSignal() { return <View style={styles.destinationSignal}><View style={styles.destinationCore} /></View>; }
function CurrentLocationSignal() { return <View style={styles.currentSignal}><View style={styles.currentCore} /></View>; }

function MapFilters({ timeWindow, sensorFilter, confidenceFilter, onTime, onSensor, onConfidence }: { timeWindow: TimeWindow; sensorFilter: SensorFilter; confidenceFilter: ConfidenceFilter; onTime: (value: TimeWindow) => void; onSensor: (value: SensorFilter) => void; onConfidence: (value: ConfidenceFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {timeOptions.map((option) => <FilterChip key={option.value} label={option.label} selected={timeWindow === option.value} onPress={() => onTime(option.value)} />)}
      <View style={styles.filterDivider} />
      {sensorOptions.map((option) => <FilterChip key={option.value} label={option.label} selected={sensorFilter === option.value} onPress={() => onSensor(option.value)} />)}
      <View style={styles.filterDivider} />
      {confidenceOptions.map((option) => <FilterChip key={option.value} label={option.label} selected={confidenceFilter === option.value} onPress={() => onConfidence(option.value)} />)}
    </ScrollView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}><Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text></Pressable>;
}

function DetectionSheet({ detection, insets, useSideSheet, sideSheetWidth, onClose, onDetails }: { detection: FireDetection; insets: { left: number; right: number }; useSideSheet: boolean; sideSheetWidth: number; onClose: () => void; onDetails: () => void }) {
  const { label: areaLabel, isResolved } = useDetectionAreaLabel(detection);
  return (
    <View style={[styles.sheet, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }, useSideSheet && [styles.sheetLandscape, { paddingHorizontal: 20, right: insets.right + 16, width: sideSheetWidth }]]}>
      <View style={styles.handle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetEyebrow}>RECENT OBSERVATION</Text><Text style={styles.sheetTitle}>Satellite observation</Text></View><Pressable accessibilityLabel="Close detection preview" onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
      <Text numberOfLines={2} style={styles.sheetArea}>{areaLabel}</Text>
      <Text style={styles.observed}>{isResolved ? "Approximate locality around observation" : "Nearest reference place"} · Observed {formatObservationTime(detection.acquiredAtUtc)}</Text>
      <View style={styles.details}><Detail label="INTENSITY" value={intensityLabel(detection.intensityLevel)} /><Detail label="CONFIDENCE" value={formatConfidence(detection).replace(" confidence", "")} />{detection.frpMw !== undefined ? <Detail label="FRP" value={`${detection.frpMw.toFixed(1)} MW`} /> : null}</View>
      <Pressable accessibilityRole="button" onPress={onDetails} style={styles.detailButton}><Text style={styles.detailButtonText}>View full details</Text><Text style={styles.detailButtonText}>→</Text></Pressable>
    </View>
  );
}

function DestinationSheet({ destination, count, nearestKm, latestAtUtc, insets, useSideSheet, sideSheetWidth, onClose, onViewNearest }: { destination: { name: string; region: string }; count: number; nearestKm?: number; latestAtUtc?: string; insets: { left: number; right: number }; useSideSheet: boolean; sideSheetWidth: number; onClose: () => void; onViewNearest?: () => void }) {
  return (
    <View style={[styles.sheet, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }, useSideSheet && [styles.sheetLandscape, { paddingHorizontal: 20, right: insets.right + 16, width: sideSheetWidth }]]}>
      <View style={styles.handle} /><View style={styles.sheetHeader}><View style={styles.sheetHeaderCopy}><Text style={styles.sheetEyebrow}>DESTINATION · INDIA</Text><Text style={styles.sheetTitle}>{destination.name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close destination preview" onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><Text numberOfLines={2} style={styles.observed}>{destination.region}</Text>
      <View style={styles.details}><Detail label="RECENT DETECTIONS" value={`${count} within 25 km`} />{nearestKm !== undefined ? <Detail label="NEAREST" value={formatDistanceKm(nearestKm)} /> : null}{latestAtUtc ? <Detail label="LATEST" value={formatObservationTime(latestAtUtc)} /> : null}</View>
      <Text style={styles.destinationNote}>{count === 0 ? "No recent satellite detections were found within 25 km. This is not a safety clearance." : "The radius shows recent satellite observations, not a confirmed incident boundary."}</Text>
      {onViewNearest ? <Pressable accessibilityRole="button" accessibilityLabel="View the nearest satellite detection" onPress={onViewNearest} style={styles.detailButton}><Text style={styles.detailButtonText}>View nearest detection</Text><Text style={styles.detailButtonText}>→</Text></Pressable> : null}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

function LegendRow({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendRow}><View style={[styles.legendSignal, { borderColor: color }]}><View style={[styles.legendCore, { backgroundColor: color }]} /></View><Text style={styles.legendLabel}>{label}</Text></View>;
}

function MapSetupState({ onOpenSearch }: { onOpenSearch: () => void }) {
  return <View style={styles.setupScreen}><View style={styles.setupCard}><Text style={styles.sheetEyebrow}>MAP UNAVAILABLE</Text><Text style={styles.setupTitle}>The map is not available in this installation.</Text><Text style={styles.setupCopy}>Recent activity and destination information remain available while the map service is being prepared.</Text><Pressable onPress={onOpenSearch} style={styles.setupButton}><Text style={styles.setupButtonText}>Search destinations</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#E7EEE6", flex: 1 },
  topOverlay: { gap: 7, position: "absolute", top: 12 },
  topOverlayLandscape: { right: undefined },
  previewBanner: { alignSelf: "flex-start", backgroundColor: "rgba(23,37,27,0.9)", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  previewBannerText: { color: colors.surface, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  locationNotice: { backgroundColor: "rgba(255,246,228,0.97)", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  locationNoticeText: { color: "#7D4B00", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  advisoryIndicator: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 12, elevation: 2, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 9 },
  advisoryDot: { backgroundColor: "#B56714", borderRadius: 5, height: 9, width: 9 },
  advisoryIndicatorText: { color: "#503612", fontSize: 10, fontWeight: "900" },
  advisoryArrow: { color: "#7A5A28", fontSize: 18, lineHeight: 18 },
  mapLoading: { alignItems: "center", backgroundColor: "rgba(231,238,230,0.42)", bottom: 0, justifyContent: "center", left: 0, padding: 24, position: "absolute", right: 0, top: 0 },
  mapLoadingCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 16, gap: 8, maxWidth: 340, padding: 16, width: "100%" },
  mapLoadingTitle: { color: colors.forest, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  mapLoadingCopy: { color: "#647168", fontSize: 11, lineHeight: 16 },
  mapRetry: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.forest, borderRadius: 10, marginTop: 2, paddingHorizontal: 13, paddingVertical: 9 },
  mapRetryText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  searchControl: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 15, elevation: 2, flexDirection: "row", gap: 9, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#1D3724", shadowOpacity: 0.12, shadowRadius: 8 },
  searchGlyph: { color: colors.forestAccent, fontSize: 22 }, searchText: { color: "#33443A", flex: 1, fontSize: 13, fontWeight: "700" }, searchArrow: { color: colors.forestAccent, fontSize: 24 },
  filterRow: { gap: 7, paddingRight: 14 }, filterDivider: { width: 2 }, filterChip: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 15, paddingHorizontal: 11, paddingVertical: 8 }, filterChipSelected: { backgroundColor: colors.forest }, filterChipText: { color: "#46554B", fontSize: 10, fontWeight: "800" }, filterChipTextSelected: { color: colors.surface },
  destinationSignal: { alignItems: "center", backgroundColor: "rgba(37,99,235,0.18)", borderColor: colors.destination, borderRadius: 18, borderWidth: 2, height: 36, justifyContent: "center", width: 36 }, destinationCore: { backgroundColor: colors.destination, borderColor: colors.surface, borderRadius: 7, borderWidth: 2, height: 14, width: 14 }, currentSignal: { alignItems: "center", backgroundColor: "rgba(37,99,235,0.16)", borderRadius: 15, height: 30, justifyContent: "center", width: 30 }, currentCore: { backgroundColor: colors.destination, borderColor: colors.surface, borderRadius: 7, borderWidth: 2, height: 14, width: 14 },
  actions: { alignItems: "flex-end", gap: 9, position: "absolute" }, compactAction: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 12, elevation: 2, justifyContent: "center", minHeight: 36, paddingHorizontal: 10 }, compactActionText: { color: colors.forest, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 }, roundAction: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 22, elevation: 2, height: 44, justifyContent: "center", width: 44 }, roundActionText: { color: colors.forest, fontSize: 23, fontWeight: "700" }, locationAction: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 24, elevation: 2, height: 48, justifyContent: "center", width: 48 }, locationActionText: { color: colors.destination, fontSize: 25, fontWeight: "800" },
  legend: { alignItems: "flex-start", gap: 7, maxWidth: 250, position: "absolute" }, legendButton: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 11, elevation: 2, paddingHorizontal: 10, paddingVertical: 9 }, legendButtonText: { color: colors.forest, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 }, legendCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 14, gap: 8, padding: 12, width: 235 }, legendTitle: { color: colors.forestAccent, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }, legendRow: { alignItems: "center", flexDirection: "row", gap: 9 }, legendSignal: { alignItems: "center", borderRadius: 12, borderWidth: 2, height: 24, justifyContent: "center", width: 24 }, legendCore: { borderRadius: 5, height: 10, width: 10 }, legendLabel: { color: "#435148", fontSize: 11, fontWeight: "700" }, legendNote: { color: "#66736B", fontSize: 10, lineHeight: 14, marginTop: 2 },
  mapHint: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 14, padding: 13 }, mapHintTitle: { color: "#1B3020", fontSize: 13, fontWeight: "800" }, mapHintText: { color: "#647168", fontSize: 11, lineHeight: 16, marginTop: 4 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, paddingBottom: 20, paddingTop: 18, position: "absolute", right: 0 }, sheetLandscape: { borderRadius: 24, bottom: 16, left: undefined }, handle: { alignSelf: "center", backgroundColor: "#D8E0DA", borderRadius: 2, height: 4, marginBottom: 14, width: 36 }, sheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, sheetHeaderCopy: { flex: 1, paddingRight: 12 }, sheetEyebrow: { color: colors.forestAccent, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }, sheetTitle: { color: colors.charcoal, fontSize: 20, fontWeight: "800", marginTop: 3 }, close: { color: "#506056", fontSize: 28, lineHeight: 28 }, observed: { color: "#5D6D62", fontSize: 12, marginTop: 5 }, details: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }, detail: { backgroundColor: "#F3F7F4", borderRadius: 10, flexGrow: 1, gap: 3, minWidth: "29%", padding: 10 }, detailLabel: { color: "#6A766D", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 }, detailValue: { color: "#203326", fontSize: 11, fontWeight: "800" }, detailButton: { alignItems: "center", backgroundColor: "#E8F2EA", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", marginTop: 13, padding: 13 }, detailButtonText: { color: colors.forestAccent, fontSize: 13, fontWeight: "800" }, destinationNote: { color: "#65736A", fontSize: 11, lineHeight: 16, marginTop: 11 },
  sheetArea: { color: colors.forest, fontSize: 15, fontWeight: "900", lineHeight: 20, marginTop: 9 },
  setupScreen: { alignItems: "center", backgroundColor: "#F5F8F5", flex: 1, justifyContent: "center", padding: 22 }, setupCard: { backgroundColor: colors.surface, borderRadius: 20, gap: 12, maxWidth: 520, padding: 22, width: "100%" }, setupTitle: { color: "#18301F", fontSize: 24, fontWeight: "800", lineHeight: 30 }, setupCopy: { color: "#607066", fontSize: 13, lineHeight: 20 }, setupButton: { alignItems: "center", backgroundColor: colors.forest, borderRadius: 13, padding: 14 }, setupButtonText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
});

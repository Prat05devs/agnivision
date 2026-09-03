import { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";

import { ThermalHeatLayer } from "./ThermalHeatLayer";
import { FireMapMarker } from "./FireMapMarker";
import { clusterDetections, isCoordinateInIndiaScope } from "../map/clustering";
import { AGNIVISION_GOOGLE_MAP_STYLE } from "../map/googleMapStyle";
import { googleMapsEnabled, useIosDevelopmentMapKit } from "../map/provider";
import { selectionHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { filterDetections } from "../utils/fire";
import { intensityLabel } from "../utils/intensity";

export function HomeMapPreview() {
  const mapRef = useRef<MapView>(null);
  const { width } = useWindowDimensions();
  const detections = useAppStore((state) => state.detections);
  const timeWindow = useAppStore((state) => state.timeWindow);
  const sensorFilter = useAppStore((state) => state.sensorFilter);
  const confidenceFilter = useAppStore((state) => state.confidenceFilter);
  const mapRegion = useAppStore((state) => state.mapRegion);
  const setMapRegion = useAppStore((state) => state.setMapRegion);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const showDetectionOnMap = useAppStore((state) => state.showDetectionOnMap);

  const filteredDetections = useMemo(
    () => filterDetections(detections, timeWindow, sensorFilter, confidenceFilter).filter((detection) =>
      isCoordinateInIndiaScope({ latitude: detection.latitude, longitude: detection.longitude })),
    [confidenceFilter, detections, sensorFilter, timeWindow],
  );
  const nodes = useMemo(() => clusterDetections(filteredDetections, mapRegion), [filteredDetections, mapRegion]);
  const previewHeight = Math.min(360, Math.max(270, width * 0.62));

  const openFullMap = () => {
    void selectionHaptic();
    setActiveTab("map");
  };

  if (!googleMapsEnabled && !useIosDevelopmentMapKit) {
    return (
      <Pressable accessibilityRole="button" onPress={openFullMap} style={styles.unavailable}>
        <Text style={styles.unavailableTitle}>Open the India map</Text>
        <Text style={styles.unavailableCopy}>Explore recent thermal activity and destination context.</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { height: previewHeight }]}> 
      <MapView
        ref={mapRef}
        customMapStyle={useIosDevelopmentMapKit ? undefined : AGNIVISION_GOOGLE_MAP_STYLE}
        initialRegion={mapRegion}
        onRegionChangeComplete={setMapRegion}
        pitchEnabled={false}
        provider={useIosDevelopmentMapKit ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        rotateEnabled={false}
        scrollEnabled
        showsCompass={false}
        showsMyLocationButton={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        zoomEnabled
      >
        {!useIosDevelopmentMapKit ? <ThermalHeatLayer detections={filteredDetections} radius={32} /> : null}
        {nodes.map((node) => {
          if (node.kind === "cluster") return null;
          return (
            <Marker
              anchor={{ x: 0.5, y: 1 }}
              key={node.detection.id}
              accessibilityLabel={`Recent satellite observation, ${intensityLabel(node.detection.intensityLevel)} intensity`}
              coordinate={{ latitude: node.detection.latitude, longitude: node.detection.longitude }}
              onPress={() => showDetectionOnMap(node.detection.id)}
              stopPropagation
              tracksViewChanges={false}
            >
              <FireMapMarker compact />
            </Marker>
          );
        })}
      </MapView>

      <View pointerEvents="none" style={styles.contextBadge}>
        <View style={styles.liveDot} />
        <View>
          <Text style={styles.contextTitle}>India situation</Text>
          <Text style={styles.contextCopy}>{filteredDetections.length} recent observations</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={openFullMap}
        style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
      >
        <Text style={styles.openButtonText}>Open full map</Text>
        <Text style={styles.openButtonText}>↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#E7EEE8", borderRadius: 22, elevation: 2, overflow: "hidden", position: "relative" },
  contextBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 14, flexDirection: "row", gap: 9, left: 12, paddingHorizontal: 12, paddingVertical: 10, position: "absolute", top: 12 },
  liveDot: { backgroundColor: "#1F9A55", borderRadius: 5, height: 9, width: 9 },
  contextTitle: { color: "#163820", fontSize: 12, fontWeight: "900" },
  contextCopy: { color: "#617067", fontSize: 9, fontWeight: "700", marginTop: 1 },
  openButton: { alignItems: "center", backgroundColor: "#14532D", borderRadius: 13, bottom: 12, flexDirection: "row", gap: 10, justifyContent: "space-between", minHeight: 44, paddingHorizontal: 14, position: "absolute", right: 12 },
  openButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72 },
  unavailable: { backgroundColor: "#E8F1EA", borderRadius: 22, gap: 5, minHeight: 220, padding: 22, justifyContent: "center" },
  unavailableTitle: { color: "#173820", fontSize: 22, fontWeight: "900" },
  unavailableCopy: { color: "#5D6D62", fontSize: 13, lineHeight: 19 },
});

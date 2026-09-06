import { useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { releaseCapture, type ViewShotRef } from "react-native-view-shot";

import { FlowHeader } from "../components/FlowHeader";
import { ShareableObservationCard } from "../components/ShareableObservationCard";
import { useDetectionAreaLabel } from "../hooks/useDetectionAreaLabel";
import { saveObservationImage, shareObservationImage } from "../services/observationImageService";
import { shareObservationLocation } from "../services/observationLocationService";
import { errorHaptic, successHaptic, warningHaptic } from "../services/haptics";
import { useAppStore } from "../store/useAppStore";
import { formatConfidence, formatObservationTime, formatSensor } from "../utils/fire";
import { intensityLabel } from "../utils/intensity";

type ShareAction = "location" | "image" | "save" | null;

export function DetectionDetailsScreen() {
  const insets = useSafeAreaInsets();
  const shareCardRef = useRef<ViewShotRef>(null);
  const [shareAction, setShareAction] = useState<ShareAction>(null);
  const [sourceDetailsExpanded, setSourceDetailsExpanded] = useState(false);
  const selectedDetectionId = useAppStore((state) => state.selectedDetectionId);
  const detections = useAppStore((state) => state.detections);
  const closeOverlay = useAppStore((state) => state.closeOverlay);

  const detection = detections.find((item) => item.id === selectedDetectionId) ?? null;
  const { label: areaLabel, isResolved: areaResolved } = useDetectionAreaLabel(detection);

  if (!detection) {
    return (
      <View style={styles.screen}>
        <FlowHeader eyebrow="OBSERVATION" title="Detection details" onBack={closeOverlay} />
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>This observation is no longer available in the current dataset.</Text>
        </View>
      </View>
    );
  }

  const captureObservation = async () => {
    if (!shareCardRef.current) {
      throw new Error("The observation image is not ready yet.");
    }

    return shareCardRef.current.capture();
  };

  const handleShareImage = async () => {
    setShareAction("image");
    let uri: string | null = null;
    try {
      uri = await captureObservation();
      const available = await shareObservationImage(uri);
      if (!available) {
        await warningHaptic();
        Alert.alert("Sharing unavailable", "Image sharing is not available on this device.");
      } else {
        await successHaptic();
      }
    } catch {
      await errorHaptic();
      Alert.alert("Couldn’t share image", "The observation image could not be created. Please try again.");
    } finally {
      if (uri) {
        releaseCapture(uri);
      }
      setShareAction(null);
    }
  };

  const handleSaveImage = async () => {
    setShareAction("save");
    let uri: string | null = null;
    try {
      uri = await captureObservation();
      const result = await saveObservationImage(uri);
      if (result === "permission-denied") {
        await warningHaptic();
        Alert.alert("Photos permission needed", "Allow photo access to save observation images to your gallery.");
      } else if (result === "native-module-unavailable") {
        const available = await shareObservationImage(uri);
        if (!available) {
          await warningHaptic();
          Alert.alert(
            "Gallery saving unavailable",
            "Direct gallery saving will be available after installing the production app build.",
          );
        } else {
          await successHaptic();
        }
      } else {
        await successHaptic();
        Alert.alert("Saved", "The observation image was saved to your photo gallery.");
      }
    } catch {
      await errorHaptic();
      Alert.alert("Couldn’t save image", "The observation image could not be saved. Please try again.");
    } finally {
      if (uri) {
        releaseCapture(uri);
      }
      setShareAction(null);
    }
  };

  const handleShareLocation = async () => {
    setShareAction("location");
    try {
      const shared = await shareObservationLocation(
        { latitude: detection.latitude, longitude: detection.longitude },
        areaLabel,
      );
      if (shared) {
        await successHaptic();
      }
    } catch {
      await errorHaptic();
      Alert.alert("Couldn’t share location", "The observation location could not be shared. Please try again.");
    } finally {
      setShareAction(null);
    }
  };

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="OBSERVATION" title="Detection details" onBack={closeOverlay} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { paddingBottom: 32 + (Platform.OS === "android" ? insets.bottom : 0) }]} showsVerticalScrollIndicator={false}>
        <ViewShot ref={shareCardRef} options={{ fileName: "agnivision-observation", format: "png", quality: 1, result: "tmpfile" }}>
          <ShareableObservationCard detection={detection} />
        </ViewShot>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share observation location"
          disabled={shareAction !== null}
          onPress={() => void handleShareLocation()}
          style={({ pressed }) => [styles.locationAction, pressed && styles.pressed, shareAction !== null && styles.disabled]}
        >
          <View style={styles.locationActionBody}>
            <Text style={styles.locationActionText}>{shareAction === "location" ? "Opening share options…" : "Share location"}</Text>
            <Text style={styles.locationActionCopy}>Send coordinates and a link that opens in maps</Text>
          </View>
          <Text style={styles.locationActionGlyph}>⌖</Text>
        </Pressable>

        <View style={styles.imageActions}>
          <Pressable
            accessibilityRole="button"
            disabled={shareAction !== null}
            onPress={() => void handleShareImage()}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed, shareAction !== null && styles.disabled]}
          >
            <Text style={styles.primaryActionText}>{shareAction === "image" ? "Preparing…" : "Share image"}</Text>
            <Text style={styles.primaryActionText}>↗</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={shareAction !== null}
            onPress={() => void handleSaveImage()}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed, shareAction !== null && styles.disabled]}
          >
            <Text style={styles.secondaryActionText}>{shareAction === "save" ? "Saving…" : "Save to gallery"}</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <Detail label={areaResolved ? "APPROXIMATE AREA" : "NEAREST REFERENCE"} value={areaLabel} />
          <Detail label="SOURCE" value="Satellite observation" />
          <Detail label="CONFIDENCE" value={formatConfidence(detection)} />
          <Detail label="MAP INTENSITY" value={intensityLabel(detection.intensityLevel)} />
          <Detail label="LATITUDE" value={detection.latitude.toFixed(5)} />
          <Detail label="LONGITUDE" value={detection.longitude.toFixed(5)} />
          {detection.frpMw !== undefined ? <Detail label="FRP" value={`${detection.frpMw.toFixed(1)} MW`} /> : null}
          {detection.brightnessKelvin !== undefined ? <Detail label="BRIGHTNESS" value={`${detection.brightnessKelvin.toFixed(1)} K`} /> : null}
          {detection.dayNight ? <Detail label="DAY / NIGHT" value={detection.dayNight === "D" ? "Day" : "Night"} /> : null}
        </View>

        <View style={styles.sourceDisclosure}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: sourceDetailsExpanded }}
            onPress={() => setSourceDetailsExpanded((expanded) => !expanded)}
            style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
          >
            <View>
              <Text style={styles.sourceButtonTitle}>Data Sources & Attribution</Text>
              <Text style={styles.sourceButtonCopy}>Provider and sensor details</Text>
            </View>
            <Text style={styles.sourceButtonGlyph}>{sourceDetailsExpanded ? "−" : "+"}</Text>
          </Pressable>
          {sourceDetailsExpanded ? (
            <View style={styles.sourceContent}>
              <Text style={styles.sourceIntro}>This observation originated with an external satellite-data provider. AgniVision.live normalizes and presents it without claiming ownership of the underlying measurement.</Text>
              <View style={styles.grid}>
                <Detail label="PROVIDER" value="NASA FIRMS" />
                <Detail label="DATASET" value={formatSensor(detection.sensor)} />
                <Detail label="SATELLITE" value={detection.satellite} />
                <Detail label="INSTRUMENT" value={detection.instrument} />
                <Detail label="RAW CONFIDENCE" value={String(detection.confidence?.raw ?? "Not provided")} />
                <Detail label="INGESTED" value={formatObservationTime(detection.fetchedAtUtc)} />
                {detection.version ? <Detail label="PRODUCT VERSION" value={detection.version} /> : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Data interpretation</Text>
          <Text style={styles.noteText}>Confidence is a source-data quality indicator. It is not a probability that a confirmed fire exists.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FBFCFB", flex: 1 },
  content: { alignSelf: "center", gap: 16, maxWidth: 760, padding: 20, paddingTop: 18, width: "100%" },
  locationAction: { alignItems: "center", backgroundColor: "#17633A", borderRadius: 13, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  locationActionBody: { flex: 1, paddingRight: 12 },
  locationActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  locationActionCopy: { color: "#CDE6D3", fontSize: 10, marginTop: 3 },
  locationActionGlyph: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  imageActions: { flexDirection: "row", gap: 9 },
  primaryAction: { alignItems: "center", backgroundColor: "#E8F2EA", borderRadius: 13, flex: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  primaryActionText: { color: "#17633A", fontSize: 12, fontWeight: "800" },
  secondaryAction: { alignItems: "center", backgroundColor: "#E8F2EA", borderRadius: 13, flex: 1, justifyContent: "center", padding: 14 },
  secondaryActionText: { color: "#17633A", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  detail: { backgroundColor: "#FFFFFF", borderColor: "#E4EAE5", borderRadius: 13, borderWidth: 1, flexGrow: 1, gap: 4, minWidth: "47%", padding: 13 },
  detailLabel: { color: "#77837B", fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
  detailValue: { color: "#223226", fontSize: 13, fontWeight: "800" },
  sourceDisclosure: { backgroundColor: "#FFFFFF", borderColor: "#E4EAE5", borderRadius: 15, borderWidth: 1, overflow: "hidden" },
  sourceButton: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 58, padding: 14 },
  sourceButtonTitle: { color: "#24372A", fontSize: 13, fontWeight: "800" },
  sourceButtonCopy: { color: "#728078", fontSize: 10, marginTop: 3 },
  sourceButtonGlyph: { color: "#17633A", fontSize: 23, fontWeight: "700" },
  sourceContent: { borderTopColor: "#E8EDE9", borderTopWidth: 1, gap: 12, padding: 14 },
  sourceIntro: { color: "#5F6E64", fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.72 },
  note: { backgroundColor: "#F2F6F3", borderRadius: 14, gap: 5, padding: 15 },
  noteTitle: { color: "#3B4C41", fontSize: 13, fontWeight: "800" },
  noteText: { color: "#65736A", fontSize: 12, lineHeight: 18 },
  missing: { padding: 20 },
  missingTitle: { color: "#35463B", fontSize: 16, fontWeight: "800", lineHeight: 23 },
});

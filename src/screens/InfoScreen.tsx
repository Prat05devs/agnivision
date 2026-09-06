import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";

export function InfoScreen({ embedded = false }: { embedded?: boolean }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const content = (
    <>
      <View>
        <Text style={styles.eyebrow}>ABOUT AGNIVISION.LIVE</Text>
        <Text style={styles.title}>Clear geographic intelligence.</Text>
        <Text style={styles.lead}>
          AgniVision.live presents satellite observations and official government advisories while preserving their distinct meaning and provenance.
        </Text>
      </View>

      <InfoCard title="What a marker means" body="A marker represents a satellite-detected thermal anomaly. It does not show a verified incident, an exact fire boundary, or an official safety status." />
      <InfoCard title="Observation versus refresh time" body="Observation time is when a sensor made its observation. Refresh time is when the app’s data service last successfully retrieved the normalized data." />

      <View style={styles.sourcesCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: sourcesExpanded }}
          onPress={() => setSourcesExpanded((expanded) => !expanded)}
          style={({ pressed }) => [styles.sourcesButton, pressed && styles.pressed]}
        >
          <View style={styles.sourcesButtonCopy}>
            <Text style={styles.cardTitle}>Data Sources & Attribution</Text>
            <Text style={styles.cardBody}>View upstream provider and sensor information.</Text>
          </View>
          <Text style={styles.sourcesGlyph}>{sourcesExpanded ? "−" : "+"}</Text>
        </Pressable>
        {sourcesExpanded ? (
          <View style={styles.sourcesContent}>
            <Text style={styles.sourceTitle}>NASA FIRMS</Text>
            <Text style={styles.cardBody}>Thermal-anomaly observations are provided through NASA’s Fire Information for Resource Management System. AgniVision.live does not claim to have generated these satellite measurements.</Text>
            <Text style={styles.sourceTitle}>VIIRS and MODIS</Text>
            <Text style={styles.cardBody}>Detailed records may identify VIIRS observations from NOAA-20, NOAA-21, or Suomi NPP and MODIS observations from Terra or Aqua, depending on provider availability.</Text>
            <Text style={styles.sourceTitle}>NDMA SACHET</Text>
            <Text style={styles.cardBody}>Official multi-hazard advisories are distributed through India’s National Disaster Management Authority SACHET Common Alerting Protocol feed. Their official severity and wording remain separate from satellite-detection confidence.</Text>
            <Text style={styles.sourceTitle}>AgniVision.live data gateway</Text>
            <Text style={styles.cardBody}>The application receives a normalized, cached response from its controlled backend. External credentials stay server-side, while original provider, sensor, observation time, confidence, and ingestion metadata remain available for auditability.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.importantNote}>
        <Text style={styles.noteTitle}>Important</Text>
        <Text style={styles.noteText}>
          Do not use this app as an emergency, evacuation, navigation, or safety-certification service. Follow official local guidance in an emergency.
        </Text>
      </View>

      <Text style={styles.version}>AgniVision.live · v{version}</Text>
    </>
  );

  return embedded ? (
    <View style={styles.content}>{content}</View>
  ) : (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{content}</ScrollView>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", backgroundColor: "#FBFCFB", gap: 14, maxWidth: 760, padding: 20, paddingBottom: 32, width: "100%" },
  eyebrow: { color: "#17633A", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#17271B", fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  lead: { color: "#607066", fontSize: 14, lineHeight: 21, marginTop: 10 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E4EAE5", borderRadius: 16, borderWidth: 1, gap: 6, padding: 16 },
  cardTitle: { color: "#1D3022", fontSize: 15, fontWeight: "800" },
  cardBody: { color: "#5E6D63", fontSize: 13, lineHeight: 19 },
  sourcesCard: { backgroundColor: "#FFFFFF", borderColor: "#E4EAE5", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sourcesButton: { alignItems: "center", flexDirection: "row", minHeight: 68, padding: 16 },
  sourcesButtonCopy: { flex: 1, gap: 5, paddingRight: 12 },
  sourcesGlyph: { color: "#17633A", fontSize: 24, fontWeight: "700" },
  sourcesContent: { borderTopColor: "#E7ECE8", borderTopWidth: 1, gap: 6, padding: 16 },
  sourceTitle: { color: "#1D3022", fontSize: 13, fontWeight: "800", marginTop: 5 },
  pressed: { opacity: 0.7 },
  importantNote: { backgroundColor: "#FFF4E3", borderRadius: 16, gap: 6, padding: 16 },
  noteTitle: { color: "#7D4B00", fontSize: 14, fontWeight: "800" },
  noteText: { color: "#754E12", fontSize: 13, lineHeight: 19 },
  version: { color: "#849087", fontSize: 11, fontWeight: "700", marginTop: 6, textAlign: "center" },
});

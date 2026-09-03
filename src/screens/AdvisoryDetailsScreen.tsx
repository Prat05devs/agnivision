import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowHeader } from "../components/FlowHeader";
import { useAppStore } from "../store/useAppStore";
import { useAdvisoryStore } from "../store/useAdvisoryStore";
import { advisorySeverityColor, advisorySeverityLabel, formatAdvisoryTime } from "../utils/advisory";

export function AdvisoryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const close = useAppStore((state) => state.closeOverlay);
  const selectedId = useAdvisoryStore((state) => state.selectedAdvisoryId);
  const advisory = useAdvisoryStore((state) => state.advisories.find((item) => item.id === selectedId));

  if (!advisory) {
    return (
      <View style={styles.screen}>
        <FlowHeader eyebrow="OFFICIAL ADVISORY" title="Advisory" onBack={close} />
        <View style={styles.missingWrap}>
          <View style={styles.missing}>
            <Text style={styles.missingEyebrow}>ADVISORY UNAVAILABLE</Text>
            <Text style={styles.missingTitle}>This advisory is no longer active or available.</Text>
            <Text style={styles.missingText}>Return to the advisory list for the latest information from NDMA SACHET.</Text>
          </View>
        </View>
      </View>
    );
  }

  const color = advisorySeverityColor[advisory.severity];
  const area = advisory.areaDescription ?? ([advisory.district, advisory.state].filter(Boolean).join(", ") || "Area specified in official advisory");

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="OFFICIAL ADVISORY" title={advisory.event} onBack={close} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 36 + (Platform.OS === "android" ? insets.bottom : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: `${color}0A`, borderColor: `${color}24`, shadowColor: color }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.severityRow}>
              <View style={[styles.severityDot, { backgroundColor: color }]} />
              <Text style={[styles.severity, { color }]}>{advisorySeverityLabel[advisory.severity]}</Text>
            </View>
            <Text style={styles.sourceLabel}>NDMA SACHET</Text>
          </View>
          <Text style={styles.headline}>{advisory.headline}</Text>
          <View style={styles.areaBlock}>
            <Text style={styles.areaLabel}>AFFECTED AREA</Text>
            <Text style={styles.area}>{area}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advisory facts</Text>
          <View style={styles.factsCard}>
            <Meta label="ISSUED" value={formatAdvisoryTime(advisory.issuedAt)} />
            <Meta label="EFFECTIVE" value={formatAdvisoryTime(advisory.effectiveAt)} />
            <Meta label="VALID UNTIL" value={formatAdvisoryTime(advisory.expiresAt)} />
            <Meta label="URGENCY" value={advisory.urgency ?? "Not specified"} />
            <Meta label="CERTAINTY" value={advisory.certainty ?? "Not specified"} lastRow />
            <Meta label="AUTHORITY" value={advisory.issuingAuthority ?? "Not specified"} lastRow />
          </View>
        </View>

        {advisory.description ? <OfficialText eyebrow="OFFICIAL DESCRIPTION" title="What is happening" body={advisory.description} /> : null}
        {advisory.instruction ? <OfficialText eyebrow="OFFICIAL GUIDANCE" title="What you should do" body={advisory.instruction} emphasized /> : null}

        <View style={styles.provenance}>
          <View style={styles.verifiedMark}><Text style={styles.verifiedGlyph}>✓</Text></View>
          <View style={styles.provenanceCopy}>
            <Text style={styles.provenanceTitle}>Official source</Text>
            <Text style={styles.provenanceText}>Distributed through NDMA SACHET</Text>
            <Text numberOfLines={2} selectable style={styles.identifier}>CAP identifier · {advisory.sourceIdentifier}</Text>
            <Text style={styles.provenanceNote}>AgniVision reproduces the official wording without rewriting it.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ label, value, lastRow = false }: { label: string; value: string; lastRow?: boolean }) {
  return (
    <View style={[styles.metaItem, lastRow && styles.metaItemLast]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function OfficialText({ eyebrow, title, body, emphasized = false }: { eyebrow: string; title: string; body: string; emphasized?: boolean }) {
  return (
    <View style={[styles.textCard, emphasized && styles.instructionCard]}>
      <Text style={[styles.textEyebrow, emphasized && styles.instructionEyebrow]}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text selectable style={styles.officialText}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { alignSelf: "center", gap: 16, maxWidth: 760, padding: 18, width: "100%" },
  hero: { borderRadius: 20, borderWidth: 1, elevation: 3, gap: 15, padding: 20, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.1, shadowRadius: 14 },
  heroTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  severityRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  severityDot: { borderRadius: 5, height: 9, width: 9 },
  severity: { fontSize: 10, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  sourceLabel: { color: "#748078", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  headline: { color: "#17271B", fontSize: 22, fontWeight: "800", letterSpacing: -0.5, lineHeight: 29 },
  areaBlock: { borderTopColor: "rgba(29, 48, 35, 0.10)", borderTopWidth: StyleSheet.hairlineWidth, gap: 5, paddingTop: 13 },
  areaLabel: { color: "#7B867E", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  area: { color: "#4D5D52", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  section: { gap: 9 },
  sectionTitle: { color: "#1D3023", fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  factsCard: { backgroundColor: "#FFFFFF", borderColor: "#E2E8E3", borderRadius: 18, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", overflow: "hidden", paddingHorizontal: 16 },
  metaItem: { borderBottomColor: "#E9EEEA", borderBottomWidth: StyleSheet.hairlineWidth, flexBasis: "50%", gap: 5, minHeight: 72, paddingBottom: 13, paddingRight: 10, paddingTop: 13 },
  metaItemLast: { borderBottomWidth: 0 },
  metaLabel: { color: "#7A857D", fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  metaValue: { color: "#26382B", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  textCard: { backgroundColor: "#FFFFFF", borderColor: "#E2E8E3", borderRadius: 18, borderWidth: 1, gap: 7, padding: 18 },
  instructionCard: { backgroundColor: "#FFF8EC", borderColor: "#EED4A8" },
  textEyebrow: { color: "#748078", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  instructionEyebrow: { color: "#986019" },
  cardTitle: { color: "#203326", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  officialText: { color: "#435148", fontSize: 15, lineHeight: 23 },
  provenance: { alignItems: "flex-start", backgroundColor: "#EDF5EF", borderColor: "#D9E8DC", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15 },
  verifiedMark: { alignItems: "center", backgroundColor: "#17633A", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  verifiedGlyph: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  provenanceCopy: { flex: 1, gap: 3 },
  provenanceTitle: { color: "#24452F", fontSize: 13, fontWeight: "900" },
  provenanceText: { color: "#486451", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  identifier: { color: "#68786D", fontSize: 9, lineHeight: 14 },
  provenanceNote: { color: "#718078", fontSize: 10, lineHeight: 15, marginTop: 3 },
  missingWrap: { alignItems: "center", flex: 1, padding: 18, paddingTop: 28 },
  missing: { alignItems: "flex-start", backgroundColor: "#FFFFFF", borderColor: "#E2E8E3", borderRadius: 18, borderWidth: 1, gap: 8, maxWidth: 520, padding: 20, width: "100%" },
  missingEyebrow: { color: "#7A857D", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  missingTitle: { color: "#203326", fontSize: 18, fontWeight: "800", lineHeight: 24 },
  missingText: { color: "#607066", fontSize: 13, lineHeight: 19 },
});

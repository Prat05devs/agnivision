import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAdvisoryStore, type AdvisoryStatus } from "../store/useAdvisoryStore";
import type { DataStatus } from "../store/useAppStore";
import type { OfficialAdvisory } from "../types/advisory";
import type { FireDetection } from "../types/fire";
import { isAdvisoryForUttarakhand, isCoordinateInUttarakhand } from "../utils/uttarakhand";
import { AdvisoryCard } from "./AdvisoryCard";
import { DetectionCard } from "./DetectionCard";

type RegionalUpdate =
  | { kind: "detection"; occurredAt: string; value: FireDetection }
  | { kind: "advisory"; occurredAt: string; value: OfficialAdvisory };

const MAX_VISIBLE_UPDATES = 5;

function isLoading(status: DataStatus | AdvisoryStatus) {
  return status === "idle" || status === "loading" || status === "refreshing";
}

export function UttarakhandUpdatesSection({
  detections,
  dataStatus,
  onOpenDetection,
}: {
  detections: FireDetection[];
  dataStatus: DataStatus;
  onOpenDetection: (id: string) => void;
}) {
  const advisories = useAdvisoryStore((state) => state.advisories);
  const advisoryStatus = useAdvisoryStore((state) => state.status);
  const openAdvisory = useAdvisoryStore((state) => state.openAdvisory);

  const regionalDetections = useMemo(
    () => detections.filter((detection) => isCoordinateInUttarakhand(detection)),
    [detections],
  );
  const regionalAdvisories = useMemo(
    () => advisories.filter(isAdvisoryForUttarakhand),
    [advisories],
  );
  const updates = useMemo<RegionalUpdate[]>(
    () =>
      [
        ...regionalDetections.map((value) => ({ kind: "detection" as const, occurredAt: value.acquiredAtUtc, value })),
        ...regionalAdvisories.map((value) => ({ kind: "advisory" as const, occurredAt: value.issuedAt, value })),
      ].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)),
    [regionalAdvisories, regionalDetections],
  );

  const feedLoading = updates.length === 0 && (isLoading(dataStatus) || isLoading(advisoryStatus));

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>UTTARAKHAND</Text>
          <Text style={styles.title}>Recent updates</Text>
          <Text style={styles.summary}>
            {regionalDetections.length} satellite {regionalDetections.length === 1 ? "observation" : "observations"} · {regionalAdvisories.length} NDMA {regionalAdvisories.length === 1 ? "advisory" : "advisories"}
          </Text>
        </View>
        <View style={styles.regionBadge}><Text style={styles.regionBadgeText}>UK</Text></View>
      </View>

      {updates.slice(0, MAX_VISIBLE_UPDATES).map((update) =>
        update.kind === "detection" ? (
          <DetectionCard
            key={`detection:${update.value.id}`}
            detection={update.value}
            onPress={() => onOpenDetection(update.value.id)}
          />
        ) : (
          <AdvisoryCard
            key={`advisory:${update.value.id}`}
            advisory={update.value}
            onPress={() => openAdvisory(update.value.id)}
          />
        ),
      )}

      {feedLoading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Checking Uttarakhand updates…</Text>
          <Text style={styles.emptyText}>Reviewing satellite observations and active NDMA advisories.</Text>
        </View>
      ) : null}

      {!feedLoading && updates.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No recent Uttarakhand updates found.</Text>
          <Text style={styles.emptyText}>No matching satellite observations or active NDMA advisories are currently loaded. This is not a safety clearance.</Text>
        </View>
      ) : null}

      {updates.length > MAX_VISIBLE_UPDATES ? (
        <Text style={styles.moreText}>{updates.length - MAX_VISIBLE_UPDATES} more Uttarakhand updates are available in the source feeds.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  headingCopy: { flex: 1 },
  eyebrow: { color: "#17633A", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#1A2A1E", fontSize: 20, fontWeight: "900", letterSpacing: -0.3, marginTop: 3 },
  summary: { color: "#66736B", fontSize: 11, lineHeight: 16, marginTop: 3 },
  regionBadge: { alignItems: "center", backgroundColor: "#E2F1E6", borderRadius: 15, height: 42, justifyContent: "center", width: 42 },
  regionBadgeText: { color: "#17633A", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  emptyCard: { backgroundColor: "#F1F4F2", borderRadius: 16, gap: 5, padding: 16 },
  emptyTitle: { color: "#324238", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  emptyText: { color: "#657168", fontSize: 12, lineHeight: 18 },
  moreText: { color: "#657168", fontSize: 10, lineHeight: 15, textAlign: "center" },
});

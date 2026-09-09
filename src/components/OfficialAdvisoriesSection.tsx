import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAdvisoryStore } from "../store/useAdvisoryStore";
import type { OfficialAdvisory } from "../types/advisory";
import { advisoryFreshness } from "../utils/advisory";
import { AdvisoryCard } from "./AdvisoryCard";
import { font } from "../theme/typography";

export function OfficialAdvisoriesSection({ advisories, emptyCopy = "No active official advisories for your selected area." }: { advisories?: OfficialAdvisory[]; emptyCopy?: string }) {
  const all = useAdvisoryStore((state) => state.advisories);
  const status = useAdvisoryStore((state) => state.status);
  const error = useAdvisoryStore((state) => state.error);
  const lastChecked = useAdvisoryStore((state) => state.lastCheckedAtUtc);
  const openAdvisory = useAdvisoryStore((state) => state.openAdvisory);
  const openList = useAdvisoryStore((state) => state.openList);
  const refresh = useAdvisoryStore((state) => state.refresh);
  const visible = advisories ?? all;

  return (
    <View style={styles.section}>
      <View style={styles.heading}><View><Text style={styles.title}>Official Advisories</Text><Text style={styles.freshness}>{advisoryFreshness(lastChecked)}</Text></View>{visible.length > 2 ? <Pressable onPress={openList}><Text style={styles.seeAll}>See all</Text></Pressable> : null}</View>
      {error ? <View style={styles.notice}><View style={styles.noticeCopy}><Text style={styles.noticeText}>{error}{lastChecked ? ` ${advisoryFreshness(lastChecked)}.` : ""}</Text></View><Pressable accessibilityRole="button" disabled={status === "loading" || status === "refreshing"} onPress={() => void refresh()} style={styles.retryButton}><Text style={styles.retryText}>{status === "loading" || status === "refreshing" ? "Checking…" : "Try again"}</Text></Pressable></View> : null}
      {visible.slice(0, 2).map((advisory) => <AdvisoryCard key={advisory.id} advisory={advisory} onPress={() => openAdvisory(advisory.id)} />)}
      {(status === "loading" || status === "idle") && visible.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Checking official advisories…</Text></View> : null}
      {(status === "ready" || status === "stale") && visible.length === 0 && !error ? <View style={styles.empty}><Text style={styles.emptyTitle}>{emptyCopy}</Text><Text style={styles.emptyBody}>An empty feed is not a safety clearance. Continue to follow local authorities.</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({ section: { gap: 10 }, heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { color: "#1A2A1E", fontSize: 17, ...font("800") }, freshness: { color: "#7A857D", fontSize: 10, marginTop: 3 }, seeAll: { color: "#17633A", fontSize: 13, ...font("800") }, notice: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 13, flexDirection: "row", gap: 10, padding: 12 }, noticeCopy: { flex: 1 }, noticeText: { color: "#754E12", fontSize: 11, lineHeight: 16 }, retryButton: { backgroundColor: "#7D4B00", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 }, retryText: { color: "#FFFFFF", fontSize: 10, ...font("900") }, empty: { backgroundColor: "#F1F4F2", borderRadius: 15, gap: 4, padding: 15 }, emptyTitle: { color: "#35463B", fontSize: 13, ...font("800"), lineHeight: 18 }, emptyBody: { color: "#69756D", fontSize: 11, lineHeight: 16 } });

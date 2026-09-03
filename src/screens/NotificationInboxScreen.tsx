import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowHeader } from "../components/FlowHeader";
import { useAppStore } from "../store/useAppStore";
import { useNotificationStore } from "../store/useNotificationStore";
import type { NotificationCategory } from "../types/notification";

const categoryLabels: Record<NotificationCategory, string> = {
  proximity: "Nearby",
  destination: "Destination",
  regional: "Regional",
  digest: "Digest",
  system: "Data status",
  advisory: "Official advisory",
};

export function NotificationInboxScreen() {
  const insets = useSafeAreaInsets();
  const closeOverlay = useAppStore((state) => state.closeOverlay);
  const openTarget = useAppStore((state) => state.openNotificationTarget);
  const inbox = useNotificationStore((state) => state.inbox);
  const markInboxRead = useNotificationStore((state) => state.markInboxRead);

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="NOTIFICATIONS" title="Inbox" onBack={closeOverlay} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { paddingBottom: 36 + (Platform.OS === "android" ? insets.bottom : 0) }]} showsVerticalScrollIndicator={false}>
        {inbox.length > 0 ? (
          <Pressable onPress={() => void markInboxRead()} style={styles.readButton}><Text style={styles.readButtonText}>Mark all read</Text></Pressable>
        ) : null}
        {inbox.map((entry) => (
          <Pressable key={entry.id} onPress={() => openTarget(entry.target)} style={({ pressed }) => [styles.entry, !entry.readAtUtc && styles.unread, pressed && styles.pressed]}>
            <View style={styles.meta}><Text style={styles.category}>{categoryLabels[entry.category]}</Text><Text style={styles.time}>{new Date(entry.createdAtUtc).toLocaleString()}</Text></View>
            <Text style={styles.title}>{entry.title}</Text>
            <Text style={styles.body}>{entry.body}</Text>
            {entry.delivery === "inbox-only" ? <Text style={styles.paced}>Held from push by quiet hours or notification limits</Text> : null}
          </Pressable>
        ))}
        {inbox.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No notification updates yet.</Text><Text style={styles.emptyBody}>Delivered and rate-limited updates will both appear here.</Text></View> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { alignSelf: "center", gap: 10, maxWidth: 760, padding: 18, width: "100%" },
  readButton: { alignSelf: "flex-end", paddingHorizontal: 5, paddingVertical: 4 },
  readButtonText: { color: "#17633A", fontSize: 12, fontWeight: "800" },
  entry: { backgroundColor: "#FFFFFF", borderColor: "#E1E7E2", borderRadius: 16, borderWidth: 1, gap: 7, padding: 15 },
  unread: { borderColor: "#63A274", borderLeftWidth: 4 },
  pressed: { opacity: 0.72 },
  meta: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  category: { color: "#17633A", fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  time: { color: "#7B877F", fontSize: 10 },
  title: { color: "#1D3022", fontSize: 15, fontWeight: "800" },
  body: { color: "#5F6E64", fontSize: 12, lineHeight: 18 },
  paced: { color: "#8A670E", fontSize: 10, fontWeight: "700" },
  empty: { backgroundColor: "#EEF4EF", borderRadius: 16, gap: 6, padding: 18 },
  emptyTitle: { color: "#24422E", fontSize: 15, fontWeight: "800" },
  emptyBody: { color: "#68756D", fontSize: 12, lineHeight: 18 },
});

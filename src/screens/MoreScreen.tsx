import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAppStore } from "../store/useAppStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { font } from "../theme/typography";

export function MoreScreen() {
  const openSettings = useAppStore((state) => state.openNotificationSettings);
  const openInbox = useAppStore((state) => state.openNotificationInbox);
  const openAppInfo = useAppStore((state) => state.openAppInfo);
  const inbox = useNotificationStore((state) => state.inbox);
  const preferences = useNotificationStore((state) => state.preferences);
  const permission = useNotificationStore((state) => state.notificationPermission);
  const busy = useNotificationStore((state) => state.busy);
  const setMasterEnabled = useNotificationStore((state) => state.setMasterEnabled);
  const unread = inbox.filter((entry) => !entry.readAtUtc).length;
  const notificationsOn = preferences.masterEnabled && permission === "granted";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>PREFERENCES</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.lead}>Control alerts, review updates, and learn how AgniVision uses data.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.icon}><Text style={styles.iconText}>◉</Text></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Allow notifications</Text>
              <Text style={styles.rowBody}>
                {permission === "denied" ? "Blocked in device settings" : notificationsOn ? "Alerts are on" : "Alerts are off"}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Allow notifications"
              disabled={busy}
              onValueChange={(enabled) => void setMasterEnabled(enabled)}
              trackColor={{ false: "#CCD5CE", true: "#69A879" }}
              thumbColor={notificationsOn ? "#14532D" : "#F7F8F7"}
              value={notificationsOn}
            />
          </View>
          <Divider />
          <SettingsRow icon="⚙︎" title="Notification preferences" body="Nearby alerts, watches, quiet hours, and testing" onPress={openSettings} />
          <Divider />
          <SettingsRow icon="▤" title="Notification inbox" body={unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "No unread updates"} badge={unread || undefined} onPress={openInbox} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT &amp; DATA</Text>
        <View style={styles.card}>
          <SettingsRow icon="i" title="About AgniVision.live" body="Data sources, attribution, limitations, and version" onPress={openAppInfo} />
        </View>
      </View>

      <Text style={styles.footer}>AgniVision.live · Satellite observations, clearly presented</Text>
    </ScrollView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsRow({ icon, title, body, badge, onPress }: { icon: string; title: string; body: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View>
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { alignSelf: "center", gap: 24, maxWidth: 760, padding: 20, paddingBottom: 40, width: "100%" },
  heading: { gap: 5, paddingTop: 4 },
  eyebrow: { color: "#17633A", fontSize: 10, ...font("900"), letterSpacing: 1.4 },
  title: { color: "#17271B", fontSize: 30, ...font("800"), letterSpacing: -0.8 },
  lead: { color: "#66736B", fontSize: 13, lineHeight: 19, marginTop: 3 },
  section: { gap: 8 },
  sectionLabel: { color: "#68756D", fontSize: 10, ...font("900"), letterSpacing: 1.2, marginLeft: 4 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E1E8E3", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 15, paddingVertical: 12 },
  toggleRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 72, paddingHorizontal: 15, paddingVertical: 12 },
  icon: { alignItems: "center", backgroundColor: "#E8F1EA", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  iconText: { color: "#14532D", fontSize: 17, ...font("900") },
  rowCopy: { flex: 1 },
  rowTitle: { color: "#1A2A1E", fontSize: 14, ...font("800") },
  rowBody: { color: "#6A776F", fontSize: 11, lineHeight: 16, marginTop: 3 },
  divider: { backgroundColor: "#E8ECE9", height: StyleSheet.hairlineWidth, marginLeft: 65 },
  chevron: { color: "#718078", fontSize: 27, marginLeft: 2 },
  badge: { alignItems: "center", backgroundColor: "#A63B32", borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#FFFFFF", fontSize: 10, ...font("900") },
  pressed: { backgroundColor: "#F2F6F3" },
  footer: { color: "#879189", fontSize: 10, lineHeight: 16, textAlign: "center" },
});

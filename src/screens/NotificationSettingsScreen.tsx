import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowHeader } from "../components/FlowHeader";
import { scheduleTestNotification } from "../notifications/notificationService";
import { useAppStore } from "../store/useAppStore";
import { useNotificationStore } from "../store/useNotificationStore";
import type { MinimumNotificationSeverity, NotificationPreferences } from "../types/notification";

const RADII = [5, 10, 25, 50] as const;
const SEVERITIES: Array<{ value: MinimumNotificationSeverity; label: string }> = [
  { value: "all", label: "All" },
  { value: "nominal", label: "Nominal+" },
  { value: "high", label: "High only" },
];

function hourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return `${normalized % 12} ${normalized < 12 ? "AM" : "PM"}`;
}

export function NotificationSettingsScreen() {
  const [testPending, setTestPending] = useState(false);
  const insets = useSafeAreaInsets();
  const closeOverlay = useAppStore((state) => state.closeOverlay);
  const preferences = useNotificationStore((state) => state.preferences);
  const watches = useNotificationStore((state) => state.watches);
  const permission = useNotificationStore((state) => state.notificationPermission);
  const locationPermission = useNotificationStore((state) => state.locationPermission);
  const busy = useNotificationStore((state) => state.busy);
  const error = useNotificationStore((state) => state.error);
  const setMasterEnabled = useNotificationStore((state) => state.setMasterEnabled);
  const updatePreferences = useNotificationStore((state) => state.updatePreferences);
  const removeWatch = useNotificationStore((state) => state.removeDestinationWatch);
  const setWatchRadius = useNotificationStore((state) => state.setWatchRadius);
  const requestAlwaysLocation = useNotificationStore((state) => state.requestAlwaysLocation);
  const clearStoredLocation = useNotificationStore((state) => state.clearStoredLocation);

  const updateQuietHours = (patch: Partial<NotificationPreferences["quietHours"]>) =>
    updatePreferences({ quietHours: { ...preferences.quietHours, ...patch } });

  const sendTestNotification = async () => {
    setTestPending(true);
    try {
      await scheduleTestNotification();
      await useNotificationStore.getState().refreshPermissionStates();
      Alert.alert("Test scheduled", "A notification will appear in about 3 seconds. You can leave the app open or send it to the background.");
    } catch (testError) {
      Alert.alert("Could not send test", testError instanceof Error ? testError.message : "Please try again.");
    } finally {
      setTestPending(false);
    }
  };

  const locationCopy =
    locationPermission === "always"
      ? "Always access: proximity alerts can continue when the app is closed."
      : locationPermission === "while-using"
        ? "While Using: proximity alerts work while AgniVision.live is active. Destination watches still work in the background."
        : "Location Off: proximity alerts are disabled. Destination watches, regional updates, and digests still work.";

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="NOTIFICATIONS" title="Settings" onBack={closeOverlay} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { paddingBottom: 40 + (Platform.OS === "android" ? insets.bottom : 0) }]} showsVerticalScrollIndicator={false}>
        <SettingSwitch
          title="Notifications"
          body={permission === "denied" ? "Blocked in device settings" : "Master control for all system notifications"}
          value={preferences.masterEnabled}
          disabled={busy}
          onValueChange={(value) => void setMasterEnabled(value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Section title="Test notifications" body="Runs entirely on this device, so it also works when the notification server is unavailable.">
          <View style={styles.testStatus}>
            <View style={[styles.statusDot, permission === "granted" && styles.statusDotGranted]} />
            <Text style={styles.testStatusText}>{permission === "granted" ? "Device permission granted" : permission === "denied" ? "Permission blocked in device settings" : "Permission not granted yet"}</Text>
          </View>
          <Pressable disabled={testPending} onPress={() => void sendTestNotification()} style={({ pressed }) => [styles.primaryButton, (pressed || testPending) && styles.buttonPressed]}>
            <Text style={styles.primaryButtonText}>{testPending ? "Scheduling…" : "Send test notification"}</Text>
          </Pressable>
          <Text style={styles.testHint}>The alert should arrive after 3 seconds and appear in the notification inbox.</Text>
        </Section>

        <Section title="Proximity alerts" body={locationCopy}>
          <SettingSwitch
            title="Nearby detections"
            body="Uses your most recent coarse location; it does not store a continuous route."
            value={preferences.proximityEnabled}
            onValueChange={(proximityEnabled) => void updatePreferences({ proximityEnabled })}
          />
          <Text style={styles.fieldLabel}>RADIUS</Text>
          <View style={styles.options}>
            {RADII.map((radius) => (
              <Option key={radius} selected={preferences.proximityRadiusKm === radius} label={`${radius} km`} onPress={() => void updatePreferences({ proximityRadiusKm: radius })} />
            ))}
          </View>
          <Text style={styles.fieldLabel}>MINIMUM CONFIDENCE</Text>
          <View style={styles.options}>
            {SEVERITIES.map((severity) => (
              <Option key={severity.value} selected={preferences.minimumSeverity === severity.value} label={severity.label} onPress={() => void updatePreferences({ minimumSeverity: severity.value })} />
            ))}
          </View>
          {preferences.masterEnabled && preferences.proximityEnabled && locationPermission !== "always" ? (
            <Pressable onPress={() => void requestAlwaysLocation()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Enable background proximity</Text>
            </Pressable>
          ) : null}
          <View style={styles.inlineActions}>
            <Pressable onPress={() => void Linking.openSettings()}><Text style={styles.textButton}>Open device settings</Text></Pressable>
            <Pressable onPress={() => void clearStoredLocation()}><Text style={styles.destructiveText}>Clear location &amp; disable nearby</Text></Pressable>
          </View>
        </Section>

        <Section title="Destination watches" body="These work without location permission.">
          {watches.length === 0 ? <Text style={styles.empty}>Choose a destination and tap “Notify me about this place.”</Text> : null}
          {watches.map((watch) => (
            <View key={watch.id} style={styles.watch}>
              <View style={styles.watchHeader}>
                <View style={styles.watchCopy}>
                  <Text style={styles.watchName}>{watch.name}</Text>
                  <Text style={styles.watchRegion}>{watch.region}</Text>
                </View>
                <Pressable onPress={() => void removeWatch(watch.id)}><Text style={styles.destructiveText}>Remove</Text></Pressable>
              </View>
              <View style={styles.options}>
                {RADII.map((radius) => (
                  <Option key={radius} selected={watch.radiusKm === radius} label={`${radius} km`} onPress={() => void setWatchRadius(watch.id, radius)} />
                ))}
              </View>
            </View>
          ))}
        </Section>

        <Section title="Other updates" body="Informational updates are separate from personal proximity alerts.">
          <SettingSwitch title="Official advisories" body="Government warnings affecting your location or watched destinations." value={preferences.officialAdvisoriesEnabled} onValueChange={(officialAdvisoriesEnabled) => void updatePreferences({ officialAdvisoriesEnabled })} />
          <SettingSwitch title="Minor advisory updates" body="Also push minor and informational advisories. They always remain visible in the app." value={preferences.minorAdvisoriesEnabled} onValueChange={(minorAdvisoriesEnabled) => void updatePreferences({ minorAdvisoriesEnabled })} />
          <SettingSwitch title="Regional activity" body="Unusual satellite activity; capped at two per day." value={preferences.regionalHotspotsEnabled} onValueChange={(regionalHotspotsEnabled) => void updatePreferences({ regionalHotspotsEnabled })} />
          <SettingSwitch title="Weekly digest" body="A calm national summary once per week." value={preferences.weeklyDigestEnabled} onValueChange={(weeklyDigestEnabled) => void updatePreferences({ weeklyDigestEnabled })} />
          <SettingSwitch title="Data status" body="Rare notices when source data remains stale." value={preferences.systemStatusEnabled} onValueChange={(systemStatusEnabled) => void updatePreferences({ systemStatusEnabled })} />
        </Section>

        <Section title="Quiet hours" body="Nominal and informational updates stay in the inbox instead of interrupting you.">
          <SettingSwitch title="Use quiet hours" body={`${hourLabel(preferences.quietHours.startHour)} to ${hourLabel(preferences.quietHours.endHour)}`} value={preferences.quietHours.enabled} onValueChange={(enabled) => void updateQuietHours({ enabled })} />
          <View style={styles.hourRow}>
            <HourControl label="START" hour={preferences.quietHours.startHour} onChange={(startHour) => void updateQuietHours({ startHour })} />
            <HourControl label="END" hour={preferences.quietHours.endHour} onChange={(endHour) => void updateQuietHours({ endHour })} />
          </View>
          <SettingSwitch title="High-confidence override" body="Allow High proximity and destination updates during quiet hours." value={preferences.quietHours.allowHighOverride} onValueChange={(allowHighOverride) => void updateQuietHours({ allowHighOverride })} />
        </Section>

        <Text style={styles.footnote}>AgniVision.live reports satellite detections and thermal anomalies—not verified ground incidents or safety clearances.</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionBody}>{body}</Text>{children}</View>;
}

function SettingSwitch({ title, body, value, disabled, onValueChange }: { title: string; body: string; value: boolean; disabled?: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingBody}>{body}</Text></View><Switch accessibilityLabel={title} disabled={disabled} onValueChange={onValueChange} trackColor={{ false: "#CCD5CE", true: "#69A879" }} thumbColor={value ? "#14532D" : "#F7F8F7"} value={value} /></View>;
}

function Option({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>;
}

function HourControl({ label, hour, onChange }: { label: string; hour: number; onChange: (hour: number) => void }) {
  return <View style={styles.hourControl}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.hourButtons}><Pressable onPress={() => onChange((hour + 23) % 24)} style={styles.hourButton}><Text style={styles.hourButtonText}>−</Text></Pressable><Text style={styles.hourValue}>{hourLabel(hour)}</Text><Pressable onPress={() => onChange((hour + 1) % 24)} style={styles.hourButton}><Text style={styles.hourButtonText}>+</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { alignSelf: "center", gap: 14, maxWidth: 760, padding: 18, width: "100%" },
  section: { backgroundColor: "#FFFFFF", borderColor: "#E3E9E4", borderRadius: 18, borderWidth: 1, gap: 13, padding: 16 },
  sectionTitle: { color: "#18301F", fontSize: 17, fontWeight: "800" },
  sectionBody: { color: "#65736A", fontSize: 12, lineHeight: 18, marginTop: -7 },
  settingRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  settingCopy: { flex: 1 },
  settingTitle: { color: "#213428", fontSize: 14, fontWeight: "800" },
  settingBody: { color: "#6A786F", fontSize: 11, lineHeight: 16, marginTop: 3 },
  fieldLabel: { color: "#6C786F", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: { backgroundColor: "#EEF2EF", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
  optionSelected: { backgroundColor: "#14532D" },
  optionText: { color: "#536159", fontSize: 11, fontWeight: "800" },
  optionTextSelected: { color: "#FFFFFF" },
  primaryButton: { alignItems: "center", backgroundColor: "#14532D", borderRadius: 12, padding: 13 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  textButton: { color: "#17633A", fontSize: 12, fontWeight: "800" },
  destructiveText: { color: "#A13C31", fontSize: 12, fontWeight: "800" },
  watch: { borderTopColor: "#E4E9E5", borderTopWidth: 1, gap: 10, paddingTop: 12 },
  watchHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  watchCopy: { flex: 1 },
  watchName: { color: "#213428", fontSize: 14, fontWeight: "800" },
  watchRegion: { color: "#6B776F", fontSize: 11, marginTop: 2 },
  hourRow: { flexDirection: "row", gap: 10 },
  hourControl: { flex: 1, gap: 6 },
  hourButtons: { alignItems: "center", backgroundColor: "#EFF3F0", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", padding: 5 },
  hourButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, height: 30, justifyContent: "center", width: 30 },
  hourButtonText: { color: "#17633A", fontSize: 18, fontWeight: "800" },
  hourValue: { color: "#24372A", fontSize: 11, fontWeight: "800" },
  empty: { color: "#6A776E", fontSize: 12, lineHeight: 18 },
  error: { backgroundColor: "#FCEDEB", borderRadius: 12, color: "#8C2E27", fontSize: 12, lineHeight: 18, padding: 12 },
  testStatus: { alignItems: "center", flexDirection: "row", gap: 8 },
  statusDot: { backgroundColor: "#B56B24", borderRadius: 5, height: 10, width: 10 },
  statusDotGranted: { backgroundColor: "#2F7D45" },
  testStatusText: { color: "#536159", flex: 1, fontSize: 12, fontWeight: "700" },
  testHint: { color: "#748078", fontSize: 11, lineHeight: 16 },
  buttonPressed: { opacity: 0.7 },
  footnote: { color: "#748078", fontSize: 11, lineHeight: 17, textAlign: "center" },
});

import { StyleSheet, Text, View } from "react-native";

import type { DataStatus } from "../store/useAppStore";
import { formatObservationTime } from "../utils/fire";
import { font } from "../theme/typography";

type DataStatusBannerProps = {
  status: DataStatus;
  fetchedAtUtc: string | null;
  error: string | null;
};

export function DataStatusBanner({ status, fetchedAtUtc, error }: DataStatusBannerProps) {
  if (status === "ready" && fetchedAtUtc) {
    return (
      <View style={[styles.container, styles.ready]}>
        <View style={[styles.dot, styles.readyDot]} />
        <Text style={styles.readyText}>Data refreshed {formatObservationTime(fetchedAtUtc)}</Text>
      </View>
    );
  }

  if (status === "loading" || status === "refreshing") {
    return (
      <View style={[styles.container, styles.loading]}>
        <View style={[styles.dot, styles.loadingDot]} />
        <Text style={styles.loadingText}>Loading the latest available satellite data…</Text>
      </View>
    );
  }

  if (status === "stale") {
    return (
      <View style={[styles.container, styles.warning]}>
        <View style={[styles.dot, styles.warningDot]} />
        <Text style={styles.warningText}>Showing the last available update. {error}</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.container, styles.error]}>
        <View style={[styles.dot, styles.errorDot]} />
        <Text style={styles.errorText}>{error ?? "Satellite data is unavailable."}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { alignItems: "flex-start", borderRadius: 12, flexDirection: "row", gap: 8, padding: 12 },
  dot: { borderRadius: 4, height: 8, marginTop: 4, width: 8 },
  ready: { backgroundColor: "#EAF5ED" },
  readyDot: { backgroundColor: "#23854C" },
  readyText: { color: "#17633A", flex: 1, fontSize: 12, ...font("600"), lineHeight: 18 },
  loading: { backgroundColor: "#EDF5FB" },
  loadingDot: { backgroundColor: "#2A6FAD" },
  loadingText: { color: "#245B8E", flex: 1, fontSize: 12, ...font("600"), lineHeight: 18 },
  warning: { backgroundColor: "#FFF6E4" },
  warningDot: { backgroundColor: "#BD7100" },
  warningText: { color: "#7D4B00", flex: 1, fontSize: 12, ...font("600"), lineHeight: 18 },
  error: { backgroundColor: "#FCEDEC" },
  errorDot: { backgroundColor: "#B42318" },
  errorText: { color: "#8B1E17", flex: 1, fontSize: 12, ...font("600"), lineHeight: 18 },
});

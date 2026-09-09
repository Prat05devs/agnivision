import { useEffect, useState } from "react";
import { AppState, BackHandler, Platform, StyleSheet, View } from "react-native";
import { NavigationContainer, useIsFocused } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppTabBar } from "./src/components/AppTabBar";
import { AppHeader } from "./src/components/AppHeader";
import { ActivityScreen } from "./src/screens/ActivityScreen";
import { AdvisoryDetailsScreen } from "./src/screens/AdvisoryDetailsScreen";
import { AdvisoryListScreen } from "./src/screens/AdvisoryListScreen";
import { AppInfoScreen } from "./src/screens/AppInfoScreen";
import { DestinationScreen } from "./src/screens/DestinationScreen";
import { DetectionDetailsScreen } from "./src/screens/DetectionDetailsScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { NotificationInboxScreen } from "./src/screens/NotificationInboxScreen";
import { NotificationSettingsScreen } from "./src/screens/NotificationSettingsScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { uploadCoarseLocation } from "./src/notifications/apiClient";
import { runLocalProximityCheck } from "./src/notifications/localProximityAlerts";
import { getMainBackAction } from "./src/navigation/backPolicy";
import { flushPendingNavigation, navigationRef, type RootStackParamList } from "./src/navigation/rootNavigation";
import { useAppStore } from "./src/store/useAppStore";
import { useAdvisoryStore } from "./src/store/useAdvisoryStore";
import { useNotificationStore } from "./src/store/useNotificationStore";
import type { NotificationInboxEntry } from "./src/types/notification";

const DATA_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Android selects an explicit Inter face per weight; see src/theme/typography.ts.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  const activeTab = useAppStore((state) => state.activeTab);
  const [currentRoute, setCurrentRoute] = useState<keyof RootStackParamList>("Main");
  const refreshDetections = useAppStore((state) => state.refreshDetections);
  const syncCurrentLocation = useAppStore((state) => state.syncCurrentLocation);
  const openNotificationTarget = useAppStore((state) => state.openNotificationTarget);
  const refreshAdvisories = useAdvisoryStore((state) => state.refresh);

  useEffect(() => {
    const syncNotificationContext = async () => {
      const notifications = useNotificationStore.getState();
      await notifications.refreshPermissionStates();
      if (!notifications.preferences.masterEnabled) {
        return;
      }
      await notifications.syncRegistration();
      await notifications.refreshInbox();
      const location = useAppStore.getState().userLocation;
      const locationLabel = useAppStore.getState().userLocationLabel;
      const currentNotifications = useNotificationStore.getState();
      if (location && currentNotifications.preferences.proximityEnabled && currentNotifications.locationPermission !== "off") {
        await uploadCoarseLocation(location, locationLabel).catch(() => undefined);
        // Covers the while-using case, where no background task is registered.
        await runLocalProximityCheck(location);
      }
    };

    void useNotificationStore.getState().hydrate().then(syncNotificationContext);
    void refreshDetections();
    void refreshAdvisories();
    void syncCurrentLocation().then(syncNotificationContext);

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        void refreshDetections();
        void refreshAdvisories();
      }
    }, DATA_REFRESH_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshDetections();
        void refreshAdvisories();
        void syncCurrentLocation().then(syncNotificationContext);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshAdvisories, refreshDetections, syncCurrentLocation]);

  useEffect(() => {
    const getEntry = (notification: Notifications.Notification) => {
      const value = notification.request.content.data?.inboxEntry;
      return value && typeof value === "object" ? (value as NotificationInboxEntry) : null;
    };
    const received = Notifications.addNotificationReceivedListener((notification) => {
      void useNotificationStore.getState().ingestNotification(notification);
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      void useNotificationStore.getState().ingestNotification(response.notification);
      const entry = getEntry(response.notification);
      if (entry) {
        openNotificationTarget(entry.target);
      }
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    });
    const tokenChanged = Notifications.addPushTokenListener(() => {
      if (useNotificationStore.getState().preferences.masterEnabled) {
        void useNotificationStore.getState().syncRegistration();
      }
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const entry = response ? getEntry(response.notification) : null;
      if (entry) {
        openNotificationTarget(entry.target);
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    });
    return () => {
      received.remove();
      responded.remove();
      tokenChanged.remove();
    };
  }, [openNotificationTarget]);

  useEffect(() => {
    // iOS already declares all supported orientations in Info.plist. Calling the
    // runtime lock API there produces a UIKit UIDevice.orientation warning on
    // current simulators, so dynamic locking is limited to Android.
    if (Platform.OS !== "android") return;
    const mapIsVisible = activeTab === "map" && currentRoute === "Main";
    const updateOrientation = async () => {
      try {
        await (mapIsVisible
          ? ScreenOrientation.unlockAsync()
          : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP));
      } catch {
        // Orientation support can vary by device; the current layout remains usable.
      }
    };

    void updateOrientation();
  }, [activeTab, currentRoute]);

  // Held until the Inter faces are registered so Android never paints a first
  // frame in the fallback system font. A load failure falls through rather than
  // blocking launch: the type scale degrades, the app still works.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.bootSplash} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setCurrentRoute(navigationRef.getCurrentRoute()?.name ?? "Main");
          flushPendingNavigation();
        }}
        onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name ?? "Main")}
      >
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            animation: "slide_from_right",
            contentStyle: styles.screenBackground,
            headerShown: false,
          }}
        >
          <Stack.Screen name="Main" component={MainShell} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Destination" component={DestinationScreen} />
          <Stack.Screen name="DetectionDetails" component={DetectionDetailsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
          <Stack.Screen name="AppInfo" component={AppInfoScreen} />
          <Stack.Screen name="AdvisoryList" component={AdvisoryListScreen} />
          <Stack.Screen name="AdvisoryDetails" component={AdvisoryDetailsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function MainShell() {
  const isFocused = useIsFocused();
  const activeTab = useAppStore((state) => state.activeTab);
  const selectedDetectionId = useAppStore((state) => state.selectedDetectionId);
  const selectedDestination = useAppStore((state) => state.selectedDestination);
  const clearMapSelection = useAppStore((state) => state.clearMapSelection);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isFocused) return false;
      const action = getMainBackAction(activeTab, selectedDetectionId !== null || selectedDestination !== null);
      if (action === "close-map-selection") {
        clearMapSelection();
        return true;
      }
      if (action === "go-home") {
        setActiveTab("home");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, clearMapSelection, isFocused, selectedDestination, selectedDetectionId, setActiveTab]);

  return (
    <View style={styles.shell}>
      <AppHeader />
      <View style={styles.content}>
        {activeTab === "home" ? <HomeScreen /> : null}
        {activeTab === "map" ? <MapScreen /> : null}
        {activeTab === "activity" ? <ActivityScreen /> : null}
        {activeTab === "info" ? <MoreScreen /> : null}
      </View>
      <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: "#F8F9FC", flex: 1 },
  content: { flex: 1 },
  screenBackground: { backgroundColor: "#F8F9FC" },
  bootSplash: { backgroundColor: "#F8F9FC", flex: 1 },
});

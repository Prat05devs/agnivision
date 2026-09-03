import { createNavigationContainerRef, StackActions } from "@react-navigation/native";

export type RootStackParamList = {
  Main: undefined;
  Search: undefined;
  Destination: undefined;
  DetectionDetails: undefined;
  NotificationSettings: undefined;
  NotificationInbox: undefined;
  AppInfo: undefined;
  AdvisoryList: undefined;
  AdvisoryDetails: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingScreen: Exclude<keyof RootStackParamList, "Main"> | null = null;

export function pushScreen(name: Exclude<keyof RootStackParamList, "Main">) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name));
  } else {
    pendingScreen = name;
  }
}

export function flushPendingNavigation() {
  if (pendingScreen && navigationRef.isReady()) {
    const screen = pendingScreen;
    pendingScreen = null;
    navigationRef.dispatch(StackActions.push(screen));
  }
}

export function returnToMain() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.dispatch(StackActions.popToTop());
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

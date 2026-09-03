import type { AppTab } from "../store/useAppStore";

export type MainBackAction = "close-map-selection" | "go-home" | "exit-app";

export function getMainBackAction(activeTab: AppTab, hasMapContext: boolean): MainBackAction {
  if (activeTab === "map" && hasMapContext) return "close-map-selection";
  if (activeTab !== "home") return "go-home";
  return "exit-app";
}

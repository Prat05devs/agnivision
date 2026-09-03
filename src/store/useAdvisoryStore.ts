import { create } from "zustand";

import { advisoryRepository } from "../data/advisoryRepository";
import { pushScreen } from "../navigation/rootNavigation";
import type { OfficialAdvisory } from "../types/advisory";

export type AdvisoryStatus = "idle" | "loading" | "ready" | "refreshing" | "stale" | "error";

type AdvisoryState = {
  advisories: OfficialAdvisory[];
  status: AdvisoryStatus;
  error: string | null;
  lastCheckedAtUtc: string | null;
  selectedAdvisoryId: string | null;
  refresh: () => Promise<void>;
  openAdvisory: (id: string) => void;
  openList: () => void;
};

export const useAdvisoryStore = create<AdvisoryState>((set, get) => ({
  advisories: [], status: "idle", error: null, lastCheckedAtUtc: null, selectedAdvisoryId: null,
  refresh: async () => {
    const existing = get().advisories;
    set({ status: existing.length ? "refreshing" : "loading", error: null });
    try {
      const response = await advisoryRepository.getActiveAdvisories();
      set({ advisories: response.advisories, status: response.isStale ? "stale" : "ready", error: response.isUnavailable ? "Official advisory data is temporarily unavailable. Cached advisories may be out of date." : null, lastCheckedAtUtc: response.lastCheckedAtUtc });
    } catch (error) {
      set({ status: existing.length ? "stale" : "error", error: error instanceof Error ? error.message : "Official advisory data is temporarily unavailable." });
    }
  },
  openAdvisory: (selectedAdvisoryId) => { set({ selectedAdvisoryId }); pushScreen("AdvisoryDetails"); },
  openList: () => pushScreen("AdvisoryList"),
}));

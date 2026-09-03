import Constants from "expo-constants";

import type { Coordinate } from "../types/fire";
import { detectionAreaCellKey } from "../utils/detectionArea";

type QueueEntry = {
  coordinate: Coordinate;
  resolvers: Array<(label: string | null) => void>;
};

const BATCH_DELAY_MS = 40;
const MAX_BATCH_SIZE = 12;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const labelCache = new Map<string, string | null>();
const retryAfter = new Map<string, number>();
const queue = new Map<string, QueueEntry>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function areaUrl() {
  const configured = process.env.EXPO_PUBLIC_DETECTION_AREA_API_URL ?? Constants.expoConfig?.extra?.detectionAreaApiUrl;
  if (configured) return configured;

  const fireDataUrl = process.env.EXPO_PUBLIC_FIRE_DATA_URL ?? Constants.expoConfig?.extra?.fireDataUrl;
  if (fireDataUrl) return `${new URL(fireDataUrl).origin}/api/detection-areas`;
  return null;
}

async function flushQueue() {
  batchTimer = null;
  const entries = [...queue.entries()].slice(0, MAX_BATCH_SIZE);
  entries.forEach(([cell]) => queue.delete(cell));

  try {
    const endpoint = areaUrl();
    if (!endpoint) throw new Error("Area endpoint is not configured.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ points: entries.map(([, entry]) => entry.coordinate) }),
    });
    if (!response.ok) throw new Error(`Area lookup returned HTTP ${response.status}.`);

    const payload = await response.json() as { areas?: Array<{ cell?: unknown; label?: unknown }> };
    const labels = new Map(
      (payload.areas ?? []).flatMap(({ cell, label }) =>
        typeof cell === "string" && typeof label === "string" ? [[cell, label] as const] : []),
    );

    for (const [cell, entry] of entries) {
      const label = labels.get(cell) ?? null;
      labelCache.set(cell, label);
      entry.resolvers.forEach((resolve) => resolve(label));
    }
  } catch {
    const nextAttempt = Date.now() + RETRY_DELAY_MS;
    for (const [cell, entry] of entries) {
      retryAfter.set(cell, nextAttempt);
      entry.resolvers.forEach((resolve) => resolve(null));
    }
  }

  if (queue.size > 0 && !batchTimer) batchTimer = setTimeout(() => void flushQueue(), BATCH_DELAY_MS);
}

export function peekDetectionAreaLabel(coordinate: Coordinate) {
  return labelCache.get(detectionAreaCellKey(coordinate)) ?? undefined;
}

export function resolveDetectionAreaLabel(coordinate: Coordinate): Promise<string | null> {
  const cell = detectionAreaCellKey(coordinate);
  if (labelCache.has(cell)) return Promise.resolve(labelCache.get(cell) ?? null);
  if ((retryAfter.get(cell) ?? 0) > Date.now()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const existing = queue.get(cell);
    if (existing) existing.resolvers.push(resolve);
    else queue.set(cell, { coordinate, resolvers: [resolve] });

    if (!batchTimer) batchTimer = setTimeout(() => void flushQueue(), BATCH_DELAY_MS);
  });
}

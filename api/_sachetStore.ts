import type { OfficialAdvisory } from "../src/types/advisory";

export type SachetRecord = {
  fetchIdentifier: string;
  etag: string | null;
  xml: string;
  advisory: OfficialAdvisory | null;
  lastCheckedAtUtc: string;
};

export type SachetSnapshot = {
  feedEtag: string | null;
  records: Record<string, SachetRecord>;
  lastAttemptAtUtc: string | null;
  lastSuccessfulFeedAtUtc: string | null;
};

const STORE_KEY = "agnivision:sachet:snapshot:v1";
let memorySnapshot: SachetSnapshot | null = null;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisCommand<T>(...args: string[]) {
  const config = redisConfig();
  if (!config) return null;
  const response = await fetch(config.url, {
    signal: AbortSignal.timeout(10_000),
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error(`Advisory storage returned HTTP ${response.status}.`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

export function emptySachetSnapshot(): SachetSnapshot {
  return { feedEtag: null, records: {}, lastAttemptAtUtc: null, lastSuccessfulFeedAtUtc: null };
}

export async function loadSachetSnapshot() {
  const raw = await redisCommand<string>("GET", STORE_KEY).catch(() => null);
  if (raw) {
    try {
      memorySnapshot = JSON.parse(raw) as SachetSnapshot;
    } catch {
      // Fall back to the last valid in-process snapshot.
    }
  }
  return memorySnapshot ?? emptySachetSnapshot();
}

export async function saveSachetSnapshot(snapshot: SachetSnapshot) {
  memorySnapshot = snapshot;
  await redisCommand("SET", STORE_KEY, JSON.stringify(snapshot)).catch(() => null);
}

import { createHash, timingSafeEqual } from "node:crypto";

import type { Coordinate } from "../src/types/fire";
import type {
  LocationPermissionLevel,
  NotificationInboxEntry,
  NotificationPreferences,
  WatchedDestination,
} from "../src/types/notification";

const KEY_PREFIX = "agnivision:notifications";

export type DeviceRecord = {
  installationId: string;
  secretHash: string;
  expoPushToken: string | null;
  platform: "android" | "ios";
  timezoneOffsetMinutes: number;
  preferences: NotificationPreferences;
  watches: WatchedDestination[];
  locationPermission: LocationPermissionLevel;
  coarseLocation: (Coordinate & { updatedAtUtc: string; areaLabel?: string }) | null;
  updatedAtUtc: string;
};

type RedisResponse<T> = { result: T; error?: string };

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Notification storage is not configured.");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function command<T>(...args: Array<string | number>) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(`Notification storage returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as RedisResponse<T>;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload.result;
}

const deviceKey = (id: string) => `${KEY_PREFIX}:device:${id}`;
const inboxKey = (id: string) => `${KEY_PREFIX}:inbox:${id}`;
const dedupKey = (id: string, eventId: string) => `${KEY_PREFIX}:dedup:${id}:${eventId}`;
const cooldownKey = (id: string, category: string) => `${KEY_PREFIX}:cooldown:${id}:${category}`;
const deliveryKey = (id: string, scope: string) => `${KEY_PREFIX}:delivery:${id}:${scope}`;

export function hashDeviceSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function deviceSecretMatches(record: DeviceRecord, secret: string) {
  const expected = Buffer.from(record.secretHash, "hex");
  const received = Buffer.from(hashDeviceSecret(secret), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function getDevice(installationId: string): Promise<DeviceRecord | null> {
  const raw = await command<string | null>("GET", deviceKey(installationId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceRecord;
  } catch {
    return null;
  }
}

export async function saveDevice(record: DeviceRecord, fields?: Array<keyof DeviceRecord>) {
  // Authentication and merge must be atomic across requests and server replicas.
  const result = await command<number>("EVAL", `
    local raw = redis.call('GET', KEYS[1])
    local incoming = cjson.decode(ARGV[1])
    if raw then
      local current = cjson.decode(raw)
      if current.secretHash ~= incoming.secretHash then return 0 end
      local fields = cjson.decode(ARGV[2])
      for _, field in ipairs(fields) do current[field] = incoming[field] end
      incoming = current
    end
    redis.call('SET', KEYS[1], cjson.encode(incoming))
    redis.call('SADD', KEYS[2], ARGV[3])
    return 1
  `, 2, deviceKey(record.installationId), `${KEY_PREFIX}:devices`, JSON.stringify(record), JSON.stringify(fields ?? Object.keys(record)), record.installationId);
  return result === 1;
}

export async function listDevices() {
  const ids = await command<string[]>("SMEMBERS", `${KEY_PREFIX}:devices`);
  const devices: Array<DeviceRecord | null> = [];
  for (let index = 0; index < (ids ?? []).length; index += 25) {
    devices.push(...await Promise.all(ids.slice(index, index + 25).map(getDevice)));
  }
  return devices.filter((device): device is DeviceRecord => device !== null);
}

export async function appendInbox(installationId: string, entry: NotificationInboxEntry) {
  await command("LPUSH", inboxKey(installationId), JSON.stringify(entry));
  await command("LTRIM", inboxKey(installationId), 0, 199);
  await command("EXPIRE", inboxKey(installationId), 180 * 24 * 60 * 60);
}

export async function getInbox(installationId: string) {
  const values = await command<string[]>("LRANGE", inboxKey(installationId), 0, 199);
  return (values ?? []).flatMap((value) => {
    try {
      return [JSON.parse(value) as NotificationInboxEntry];
    } catch {
      return [];
    }
  });
}

export async function markInboxRead(installationId: string) {
  // Never DEL/rebuild: that can discard concurrently appended notifications.
  await command("EVAL", `
    local entries = redis.call('LRANGE', KEYS[1], 0, 199)
    for index, raw in ipairs(entries) do
      local ok, entry = pcall(cjson.decode, raw)
      if ok and type(entry) == 'table' then
        if not entry.readAtUtc or entry.readAtUtc == cjson.null then entry.readAtUtc = ARGV[1] end
        redis.call('LSET', KEYS[1], index - 1, cjson.encode(entry))
      end
    end
    return #entries
  `, 1, inboxKey(installationId), new Date().toISOString());
}

export async function getDedupSeverity(installationId: string, eventId: string) {
  return command<string | null>("GET", dedupKey(installationId, eventId));
}

export async function setDedupSeverity(installationId: string, eventId: string, severity: string) {
  await command("SET", dedupKey(installationId, eventId), severity, "EX", 14 * 24 * 60 * 60);
}

export async function isCoolingDown(installationId: string, category: string) {
  return (await command<number>("EXISTS", cooldownKey(installationId, category))) === 1;
}

export async function startCooldown(installationId: string, category: string, seconds: number) {
  await command("SET", cooldownKey(installationId, category), "1", "EX", seconds);
}

export async function rollingDeliveryCount(installationId: string, scope: string, now = Date.now()) {
  const key = deliveryKey(installationId, scope);
  await command("ZREMRANGEBYSCORE", key, 0, now - 24 * 60 * 60 * 1000);
  return command<number>("ZCARD", key);
}

export async function recordDelivery(installationId: string, scope: string, eventId: string, now = Date.now()) {
  const key = deliveryKey(installationId, scope);
  await command("ZADD", key, now, `${eventId}:${now}`);
  await command("EXPIRE", key, 2 * 24 * 60 * 60);
}

export async function acquireDispatchLock() {
  return (await command<string | null>("SET", `${KEY_PREFIX}:dispatch-lock`, String(Date.now()), "NX", "EX", 8 * 60)) === "OK";
}

export async function setDailyRegionCount(day: string, region: string, count: number) {
  await command("SET", `${KEY_PREFIX}:region:${day}:${region}`, count, "EX", 14 * 24 * 60 * 60);
}

export async function getDailyRegionCount(day: string, region: string) {
  const value = await command<string | null>("GET", `${KEY_PREFIX}:region:${day}:${region}`);
  return value === null ? null : Number(value);
}

export async function incrementGlobalCounter(key: string, ttlSeconds: number) {
  const fullKey = `${KEY_PREFIX}:global:${key}`;
  const value = await command<number>("INCR", fullKey);
  if (value === 1) await command("EXPIRE", fullKey, ttlSeconds);
  return value;
}

export async function resetGlobalCounter(key: string) {
  await command("DEL", `${KEY_PREFIX}:global:${key}`);
}

export async function recordPushTicket(ticketId: string, installationId: string) {
  await Promise.all([
    command("HSET", `${KEY_PREFIX}:push-tickets`, ticketId, installationId),
    command("SADD", `${KEY_PREFIX}:pending-tickets`, ticketId),
    command("EXPIRE", `${KEY_PREFIX}:push-tickets`, 2 * 24 * 60 * 60),
    command("EXPIRE", `${KEY_PREFIX}:pending-tickets`, 2 * 24 * 60 * 60),
  ]);
}

export async function listPushTickets(limit = 500) {
  const ids = ((await command<string[] | null>("SMEMBERS", `${KEY_PREFIX}:pending-tickets`)) ?? []).slice(0, limit);
  const installations = await Promise.all(ids.map((id) => command<string | null>("HGET", `${KEY_PREFIX}:push-tickets`, id)));
  return ids.flatMap((id, index) => installations[index] ? [{ id, installationId: installations[index]! }] : []);
}

export async function clearPushTicket(ticketId: string) {
  await Promise.all([
    command("SREM", `${KEY_PREFIX}:pending-tickets`, ticketId),
    command("HDEL", `${KEY_PREFIX}:push-tickets`, ticketId),
  ]);
}

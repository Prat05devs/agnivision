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

async function readDeviceRaw(installationId: string) {
  return command<string | null>("GET", deviceKey(installationId));
}

function parseDevice(raw: string | null): DeviceRecord | null {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as DeviceRecord;
    // Defence in depth for the cjson round trip described above. Writes no longer
    // produce `watches: {}`, but a document written by an older build still could, and
    // a non-iterable value here would propagate into every consumer.
    if (!Array.isArray(record.watches)) record.watches = [];
    return record;
  } catch {
    return null;
  }
}

export async function getDevice(installationId: string): Promise<DeviceRecord | null> {
  return parseDevice(await readDeviceRaw(installationId));
}

// The stored document is written verbatim from JSON.stringify and is never re-encoded
// by Lua. Redis cjson has one table type, so a decode/encode round trip turns an empty
// array into `{}`: a device with no watches came back with `watches: {}`, which is not
// iterable and aborted the whole dispatch run. The script therefore only *reads* the
// current document (to compare secretHash and the CAS token) and SETs the string the
// caller built. The merge itself happens in JS, where arrays stay arrays.
const SAVE_DEVICE_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])
  local expected = ARGV[3]
  if raw then
    local ok, current = pcall(cjson.decode, raw)
    if ok and type(current) == 'table' then
      local incoming = cjson.decode(ARGV[1])
      if current.secretHash ~= incoming.secretHash then return 0 end
      if expected == '' or raw ~= expected then return 2 end
    end
    -- An undecodable document cannot be merged onto or authenticated against, so it is
    -- replaced rather than left to fail every future write.
  elseif expected ~= '' then
    return 2
  end
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
  redis.call('SADD', KEYS[2], ARGV[2])
  return 1
`;

// Refreshed on every write, so an app in use never expires while an uninstalled one
// ages out instead of being scanned by every dispatch for ever.
const DEVICE_TTL_SECONDS = 180 * 24 * 60 * 60;
const SAVE_DEVICE_ATTEMPTS = 5;

export async function saveDevice(record: DeviceRecord, fields?: Array<keyof DeviceRecord>) {
  const merged = fields ?? (Object.keys(record) as Array<keyof DeviceRecord>);
  for (let attempt = 0; attempt < SAVE_DEVICE_ATTEMPTS; attempt += 1) {
    const raw = await readDeviceRaw(record.installationId);
    const current = parseDevice(raw);
    let next = record;
    if (current) {
      if (current.secretHash !== record.secretHash) return false;
      next = { ...current };
      for (const field of merged) (next as Record<string, unknown>)[field] = record[field];
    }
    const result = await command<number>(
      "EVAL",
      SAVE_DEVICE_SCRIPT,
      2,
      deviceKey(record.installationId),
      `${KEY_PREFIX}:devices`,
      JSON.stringify(next),
      record.installationId,
      // A corrupt document cannot be merged onto, so replace it rather than spin.
      current ? raw ?? "" : "",
      DEVICE_TTL_SECONDS,
    );
    if (result === 1) return true;
    if (result === 0) return false;
    // result === 2: another writer changed the document first; re-read and retry.
  }
  return false;
}

export async function listDevices() {
  const ids = (await command<string[]>("SMEMBERS", `${KEY_PREFIX}:devices`)) ?? [];
  const devices: DeviceRecord[] = [];
  // Device documents expire; their ids do not. Without this the set would grow for
  // ever and every dispatch would re-read ids whose document is long gone.
  const stale: string[] = [];
  for (let index = 0; index < ids.length; index += 25) {
    const batch = ids.slice(index, index + 25);
    const records = await Promise.all(batch.map(getDevice));
    records.forEach((record, offset) => {
      if (record) devices.push(record);
      else stale.push(batch[offset]!);
    });
  }
  for (let index = 0; index < stale.length; index += 100) {
    await command("SREM", `${KEY_PREFIX}:devices`, ...stale.slice(index, index + 100));
  }
  return devices;
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

const DEDUP_TTL_SECONDS = 14 * 24 * 60 * 60;

export async function getDedupSeverity(installationId: string, eventId: string) {
  return command<string | null>("GET", dedupKey(installationId, eventId));
}

// One MGET instead of one GET per detection. A device inside a busy satellite pass can
// match hundreds of detections, and a serial round trip each made the run miss the
// function's time budget long before it finished the device list.
export async function getDedupSeverities(installationId: string, eventIds: string[]) {
  const severities = new Map<string, string | null>();
  if (eventIds.length === 0) return severities;
  const unique = [...new Set(eventIds)];
  for (let index = 0; index < unique.length; index += 200) {
    const batch = unique.slice(index, index + 200);
    const values = (await command<Array<string | null>>("MGET", ...batch.map((id) => dedupKey(installationId, id)))) ?? [];
    batch.forEach((id, offset) => severities.set(id, values[offset] ?? null));
  }
  return severities;
}

export async function setDedupSeverity(installationId: string, eventId: string, severity: string) {
  await command("SET", dedupKey(installationId, eventId), severity, "EX", DEDUP_TTL_SECONDS);
}

export async function setDedupSeverities(installationId: string, entries: Array<{ id: string; severity: string }>) {
  if (entries.length === 0) return;
  // SET per key is unavoidable (each needs its own TTL), but they pipeline concurrently
  // instead of awaiting one after another.
  for (let index = 0; index < entries.length; index += 50) {
    await Promise.all(entries.slice(index, index + 50).map((entry) =>
      command("SET", dedupKey(installationId, entry.id), entry.severity, "EX", DEDUP_TTL_SECONDS)));
  }
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

// The "new detection" window used to be a fixed 35 minutes, which silently assumed the
// scheduler fired about every ten. On the shipped daily cron that admitted only the last
// 35 minutes of a 24-hour gap, so almost nothing ever qualified. Recording the last run
// lets the window follow the actual cadence instead of a hard-coded guess.
export async function getLastDispatchAt() {
  const value = await command<string | null>(`GET`, `${KEY_PREFIX}:last-dispatch`);
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function setLastDispatchAt(timestampMs: number) {
  await command("SET", `${KEY_PREFIX}:last-dispatch`, String(timestampMs), "EX", 30 * 24 * 60 * 60);
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

// Expo serves receipts for roughly 24 hours. A ticket whose receipt never appears was
// previously only ever removed on a successful lookup, while every new push pushed the
// collection's TTL further out — so unresolved tickets accumulated indefinitely and
// eventually crowded out the newest ones. Scoring them by creation time lets a run drop
// the ones that can no longer resolve.
const PUSH_RECEIPT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PUSH_TICKET_TTL_SECONDS = 2 * 24 * 60 * 60;

export async function recordPushTicket(ticketId: string, installationId: string, now = Date.now()) {
  await Promise.all([
    command("HSET", `${KEY_PREFIX}:push-tickets`, ticketId, installationId),
    command("ZADD", `${KEY_PREFIX}:pending-tickets`, now, ticketId),
    command("EXPIRE", `${KEY_PREFIX}:push-tickets`, PUSH_TICKET_TTL_SECONDS),
    command("EXPIRE", `${KEY_PREFIX}:pending-tickets`, PUSH_TICKET_TTL_SECONDS),
  ]);
}

export async function listPushTickets(limit = 500, now = Date.now()) {
  const pendingKey = `${KEY_PREFIX}:pending-tickets`;
  const cutoff = now - PUSH_RECEIPT_WINDOW_MS;
  const expired = (await command<string[] | null>("ZRANGEBYSCORE", pendingKey, 0, cutoff)) ?? [];
  if (expired.length > 0) {
    await command("ZREMRANGEBYSCORE", pendingKey, 0, cutoff);
    for (let index = 0; index < expired.length; index += 100) {
      await command("HDEL", `${KEY_PREFIX}:push-tickets`, ...expired.slice(index, index + 100));
    }
  }
  const ids = (await command<string[] | null>("ZRANGE", pendingKey, 0, limit - 1)) ?? [];
  const installations = await Promise.all(ids.map((id) => command<string | null>("HGET", `${KEY_PREFIX}:push-tickets`, id)));
  return ids.flatMap((id, index) => installations[index] ? [{ id, installationId: installations[index]! }] : []);
}

export async function clearPushTicket(ticketId: string) {
  await Promise.all([
    command("ZREM", `${KEY_PREFIX}:pending-tickets`, ticketId),
    command("HDEL", `${KEY_PREFIX}:push-tickets`, ticketId),
  ]);
}

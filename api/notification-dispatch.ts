import { randomUUID } from "node:crypto";

import { getOfficialAdvisories } from "./_sachetProvider";
import { referencePlaces } from "../src/data/referencePlaces";
import {
  distanceKm,
  formatDetectionSource,
  getDetectionSeverity,
  isQuietTime,
  matchingDetections,
  mayInterruptDuringQuietHours,
} from "../src/notifications/rules";
import type { ConfidenceClass, FireDetection } from "../src/types/fire";
import type { NotificationCategory, NotificationInboxEntry, NotificationSeverity } from "../src/types/notification";
import type { OfficialAdvisory } from "../src/types/advisory";
import { getDetections } from "./fire-detections";
import { json } from "./_notificationHttp";
import {
  acquireDispatchLock,
  appendInbox,
  getDailyRegionCount,
  getDevice,
  getDedupSeverity,
  incrementGlobalCounter,
  isCoolingDown,
  listDevices,
  listPushTickets,
  clearPushTicket,
  recordDelivery,
  resetGlobalCounter,
  recordPushTicket,
  rollingDeliveryCount,
  saveDevice,
  setDailyRegionCount,
  setDedupSeverity,
  startCooldown,
  type DeviceRecord,
} from "./_notificationStore";

const MAX_GLOBAL_PUSHES_PER_DAY = 8;
const MAX_PROXIMITY_PUSHES_PER_DAY = 5;
const NEW_DETECTION_WINDOW_MS = 35 * 60 * 1000;
// A stationary phone may not emit another background update for several days.
// Keep an opted-in "Always" location useful without treating it as permanent.
const locationMaxAgeMs = { always: 7 * 24 * 60 * 60 * 1000, "while-using": 45 * 60 * 1000, off: 0 } as const;
const cooldownSeconds: Record<NotificationCategory, number> = {
  proximity: 30 * 60,
  destination: 60 * 60,
  regional: 12 * 60 * 60,
  digest: 6 * 24 * 60 * 60,
  system: 24 * 60 * 60,
  advisory: 60 * 60,
};

type CandidateEvent = {
  eventId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  target: NotificationInboxEntry["target"];
  dedup: Array<{ id: string; severity: ConfidenceClass }>;
};

function eventPriority(event: CandidateEvent) {
  if (event.category === "advisory") return event.severity === "extreme" ? 9 : event.severity === "severe" ? 8 : 7;
  if (event.category === "proximity") return event.severity === "high" ? 6 : 4;
  if (event.category === "destination") return event.severity === "high" ? 5 : 3;
  if (event.category === "regional") return 2;
  if (event.category === "digest") return 1;
  return 0;
}

function advisoryAffectsDevice(advisory: OfficialAdvisory, device: DeviceRecord) {
  const area = `${advisory.areaDescription ?? ""} ${advisory.state ?? ""} ${advisory.district ?? ""}`.toLowerCase();
  const watched = device.watches.some((watch) => area.includes(watch.name.toLowerCase()) || area.includes(watch.region.toLowerCase()) || (advisory.latitude !== undefined && advisory.longitude !== undefined && distanceKm(watch.coordinate, { latitude: advisory.latitude, longitude: advisory.longitude }) <= Math.max(50, watch.radiusKm)));
  const labelParts = device.coarseLocation?.areaLabel?.split(",").map((part) => part.trim().toLowerCase()).filter((part) => part.length >= 3) ?? [];
  const namedNearby = device.locationPermission !== "off" && labelParts.some((part) => area.includes(part));
  const coordinateNearby = advisory.latitude !== undefined && advisory.longitude !== undefined && device.coarseLocation && device.locationPermission !== "off" && distanceKm(device.coarseLocation, { latitude: advisory.latitude, longitude: advisory.longitude }) <= 50;
  return watched || namedNearby || Boolean(coordinateNearby);
}

function advisoryEvents(device: DeviceRecord, advisories: OfficialAdvisory[]) {
  if (!device.preferences.officialAdvisoriesEnabled) return [];
  return advisories.filter((advisory) => advisoryAffectsDevice(advisory, device)).filter((advisory) => device.preferences.minorAdvisoriesEnabled || !["info", "minor"].includes(advisory.severity)).map((advisory): CandidateEvent => ({
    eventId: `advisory:${advisory.sourceIdentifier}`,
    category: "advisory",
    severity: advisory.severity,
    title: `Official advisory${advisory.district ? ` near ${advisory.district}` : ""}`,
    body: `${advisory.event}${advisory.areaDescription ? ` for ${advisory.areaDescription}` : ""}${advisory.expiresAt ? `, valid until ${new Date(advisory.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}` : ""}.`,
    target: { advisoryId: advisory.id, ...(advisory.latitude !== undefined && advisory.longitude !== undefined ? { coordinate: { latitude: advisory.latitude, longitude: advisory.longitude } } : {}) },
    dedup: [],
  }));
}

function localDateForDevice(device: DeviceRecord, now: Date) {
  return new Date(now.getTime() - device.timezoneOffsetMinutes * 60 * 1000);
}

function observedLabel(detection: FireDetection, now: Date) {
  const elapsedMinutes = Math.max(0, Math.round((now.getTime() - Date.parse(detection.acquiredAtUtc)) / 60_000));
  return elapsedMinutes < 60 ? `${elapsedMinutes} min ago` : `${Math.round(elapsedMinutes / 60)} hr ago`;
}

function highestSeverity(matches: Array<{ detection: FireDetection }>): ConfidenceClass {
  return matches.some(({ detection }) => getDetectionSeverity(detection) === "high") ? "high" : matches.some(({ detection }) => getDetectionSeverity(detection) === "nominal") ? "nominal" : "low";
}

async function newMatchesForDevice(device: DeviceRecord, matches: ReturnType<typeof matchingDetections>, now: Date) {
  const selected: typeof matches = [];
  const escalations = new Set<string>();
  for (const match of matches) {
    const severity = getDetectionSeverity(match.detection);
    const previous = await getDedupSeverity(device.installationId, match.detection.id);
    const isEscalation = previous === "nominal" && severity === "high";
    const isRecent = Date.parse(match.detection.acquiredAtUtc) >= now.getTime() - NEW_DETECTION_WINDOW_MS;
    if ((!previous && isRecent) || isEscalation) {
      selected.push(match);
      if (isEscalation) escalations.add(match.detection.id);
    }
  }
  return { selected, escalations };
}

async function proximityEvent(device: DeviceRecord, detections: FireDetection[], now: Date): Promise<CandidateEvent | null> {
  const location = device.coarseLocation;
  if (!device.preferences.proximityEnabled || !location || device.locationPermission === "off") return null;
  if (Date.parse(location.updatedAtUtc) < now.getTime() - locationMaxAgeMs[device.locationPermission]) return null;
  const matches = matchingDetections(detections, location, device.preferences.proximityRadiusKm, device.preferences.minimumSeverity);
  const { selected, escalations } = await newMatchesForDevice(device, matches, now);
  if (selected.length === 0) return null;
  const nearest = selected[0]!;
  const severity = highestSeverity(selected);
  const update = selected.length === 1 && escalations.has(nearest.detection.id);
  return {
    eventId: `proximity:${selected.map(({ detection }) => detection.id).join("|")}`,
    category: "proximity",
    severity,
    title: update ? "Nearby satellite detection updated" : `${selected.length} new satellite detection${selected.length === 1 ? "" : "s"} near you`,
    body: `Closest ${Math.max(1, Math.round(nearest.distanceKm))} km · ${observedLabel(nearest.detection, now)} · ${severity === "high" ? "High" : severity === "nominal" ? "Nominal" : "Low"} confidence · ${formatDetectionSource(nearest.detection)}`,
    target: { detectionId: nearest.detection.id, coordinate: { latitude: nearest.detection.latitude, longitude: nearest.detection.longitude } },
    dedup: selected.map(({ detection }) => ({ id: detection.id, severity: getDetectionSeverity(detection) })),
  };
}

async function destinationEvents(device: DeviceRecord, detections: FireDetection[], now: Date) {
  const events: CandidateEvent[] = [];
  const selectedDetectionIds = new Set<string>();
  for (const watch of device.watches) {
    const matches = matchingDetections(detections, watch.coordinate, watch.radiusKm, device.preferences.minimumSeverity)
      .filter(({ detection }) => !selectedDetectionIds.has(detection.id));
    const { selected, escalations } = await newMatchesForDevice(device, matches, now);
    if (selected.length === 0) continue;
    selected.forEach(({ detection }) => selectedDetectionIds.add(detection.id));
    const nearest = selected[0]!;
    const severity = highestSeverity(selected);
    const update = selected.length === 1 && escalations.has(nearest.detection.id);
    events.push({
      eventId: `destination:${watch.id}:${selected.map(({ detection }) => detection.id).join("|")}`,
      category: "destination",
      severity,
      title: update ? `Satellite detection updated near ${watch.name}` : `${selected.length} new satellite detection${selected.length === 1 ? "" : "s"} near ${watch.name}`,
      body: `Closest ${Math.max(1, Math.round(nearest.distanceKm))} km · ${observedLabel(nearest.detection, now)} · ${severity === "high" ? "High" : severity === "nominal" ? "Nominal" : "Low"} confidence · ${formatDetectionSource(nearest.detection)}`,
      target: { destinationId: watch.id, detectionId: nearest.detection.id, coordinate: { latitude: nearest.detection.latitude, longitude: nearest.detection.longitude } },
      dedup: selected.map(({ detection }) => ({ id: detection.id, severity: getDetectionSeverity(detection) })),
    });
  }
  return events;
}

function nearestRegion(detection: FireDetection) {
  return referencePlaces.reduce((nearest, place) => {
    const candidateDistance = distanceKm(place.coordinate, { latitude: detection.latitude, longitude: detection.longitude });
    return candidateDistance < nearest.distance ? { region: place.region, place: place.name, distance: candidateDistance } : nearest;
  }, { region: "India", place: "India", distance: Number.POSITIVE_INFINITY });
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previousUtcDays(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => utcDay(new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000)));
}

async function updateRegionalHistory(detections: FireDetection[], now: Date) {
  const counts = new Map<string, number>();
  for (const detection of detections) {
    const key = `${detection.acquiredAtUtc.slice(0, 10)}|${nearestRegion(detection).region}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = utcDay(now);
  const knownRegions = new Set(referencePlaces.map((place) => place.region));
  knownRegions.forEach((region) => {
    const key = `${today}|${region}`;
    if (!counts.has(key)) counts.set(key, 0);
  });
  await Promise.all([...counts].map(([key, count]) => {
    const [day, region] = key.split("|") as [string, string];
    return setDailyRegionCount(day, region, count);
  }));
  return counts;
}

async function regionalEvents(detections: FireDetection[], now: Date) {
  const historicalCounts = await updateRegionalHistory(detections, now);
  const last24 = detections.filter((detection) => Date.parse(detection.acquiredAtUtc) >= now.getTime() - 24 * 60 * 60 * 1000);
  const groups = new Map<string, { count: number; place: string; detection: FireDetection }>();
  for (const detection of last24) {
    const location = nearestRegion(detection);
    const current = groups.get(location.region);
    groups.set(location.region, { count: (current?.count ?? 0) + 1, place: location.place, detection });
  }
  const events: CandidateEvent[] = [];
  for (const [region, group] of groups) {
    if (group.count < 15) continue;
    const availableDays = [...new Set(detections.map((detection) => detection.acquiredAtUtc.slice(0, 10)))];
    await Promise.all(availableDays.map((day) => historicalCounts.has(`${day}|${region}`) ? Promise.resolve() : setDailyRegionCount(day, region, 0)));
    const history = await Promise.all(previousUtcDays(now, 7).map((day) => getDailyRegionCount(day, region)));
    if (history.some((count) => count === null)) continue;
    const baseline = history.reduce<number>((total, count) => total + (count ?? 0), 0) / 7;
    if (baseline <= 0 || group.count < baseline * 2.5) continue;
    events.push({
      eventId: `regional:${utcDay(now)}:${region}`,
      category: "regional",
      severity: "info",
      title: `Increased satellite activity: ${region}`,
      body: `${group.count} detections in the last 24 hours, typically around ${Math.round(baseline)} per day. Nearest reference area: ${group.place}.`,
      target: { coordinate: { latitude: group.detection.latitude, longitude: group.detection.longitude } },
      dedup: [],
    });
  }
  return events.sort((a, b) => Number.parseInt(b.body) - Number.parseInt(a.body)).slice(0, 2);
}

async function weeklyDigestEvent(device: DeviceRecord, detections: FireDetection[], now: Date): Promise<CandidateEvent | null> {
  if (!device.preferences.weeklyDigestEnabled) return null;
  const local = localDateForDevice(device, now);
  if (local.getUTCDay() !== 1 || local.getUTCHours() !== 8) return null;
  const days = [utcDay(now), ...previousUtcDays(now, 6)];
  const daily = await Promise.all(days.map((day) => getDailyRegionCount(day, "__national__")));
  if (daily.some((count) => count === null)) return null;
  const total = daily.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  return {
    eventId: `digest:${days.at(-1)}:${days[0]}`,
    category: "digest",
    severity: "info",
    title: "Weekly satellite detection summary",
    body: `${total} detections were observed across India during the past seven days. Open AgniVision.live for source details and limitations.`,
    target: {},
    dedup: [],
  };
}

function channelFor(event: Pick<CandidateEvent, "category" | "severity">) {
  if (event.category === "proximity") return event.severity === "high" ? "proximity-high" : "proximity";
  if (event.category === "destination") return event.severity === "high" ? "destination-high" : "destination";
  if (event.category === "regional") return "regional-hotspots";
  if (event.category === "digest") return "weekly-digest";
  if (event.category === "advisory") return "official-advisories";
  return "system-status";
}

async function sendPush(device: DeviceRecord, entry: NotificationInboxEntry) {
  if (!device.expoPushToken) return false;
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      to: device.expoPushToken,
      title: entry.title,
      body: entry.body,
      data: { inboxEntry: entry },
      sound: "default",
      priority: ["high", "severe", "extreme"].includes(entry.severity) ? "high" : "default",
      channelId: channelFor(entry),
      categoryId: entry.category,
      ttl: 6 * 60 * 60,
    }),
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as { data?: { id?: string; status?: string; details?: { error?: string } } | Array<{ id?: string; status?: string; details?: { error?: string } }> };
  const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  if (ticket?.details?.error === "DeviceNotRegistered") {
    await saveDevice({ ...device, expoPushToken: null, updatedAtUtc: new Date().toISOString() });
  }
  if (ticket?.status === "ok" && ticket.id) {
    await recordPushTicket(ticket.id, device.installationId);
  }
  return ticket?.status === "ok";
}

async function processPushReceipts() {
  const tickets = await listPushTickets();
  if (tickets.length === 0) return;
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify({ ids: tickets.map((ticket) => ticket.id) }),
  });
  if (!response.ok) return;
  const payload = (await response.json()) as { data?: Record<string, { status?: string; details?: { error?: string } }> };
  for (const ticket of tickets) {
    const receipt = payload.data?.[ticket.id];
    if (!receipt) continue;
    if (receipt.details?.error === "DeviceNotRegistered") {
      const device = await getDevice(ticket.installationId);
      if (device) await saveDevice({ ...device, expoPushToken: null, updatedAtUtc: new Date().toISOString() });
    }
    await clearPushTicket(ticket.id);
  }
}

async function deliver(device: DeviceRecord, event: CandidateEvent, now: Date) {
  const existingEvent = await getDedupSeverity(device.installationId, event.eventId);
  if (existingEvent) return false;
  const local = localDateForDevice(device, now);
  const quiet = isQuietTime(device.preferences, local) && !mayInterruptDuringQuietHours(event.severity, device.preferences);
  const coolingDown = await isCoolingDown(device.installationId, event.category);
  const globalCount = await rollingDeliveryCount(device.installationId, "global", now.getTime());
  const categoryCount = await rollingDeliveryCount(device.installationId, event.category, now.getTime());
  const categoryCapped = event.category === "proximity" && categoryCount >= MAX_PROXIMITY_PUSHES_PER_DAY;
  const mayPush = !quiet && !coolingDown && !categoryCapped && globalCount < MAX_GLOBAL_PUSHES_PER_DAY && Boolean(device.expoPushToken);
  let payloadEvent = event;
  if (event.category === "proximity" && categoryCount === MAX_PROXIMITY_PUSHES_PER_DAY - 1 && mayPush) {
    const summaryId = `proximity-summary:${local.toISOString().slice(0, 10)}`;
    if (!(await getDedupSeverity(device.installationId, summaryId))) {
      payloadEvent = {
        ...event,
        eventId: summaryId,
        title: "Nearby satellite detection summary",
        body: "More nearby satellite detections were observed today. Open AgniVision.live to review the latest activity.",
      };
    }
  }
  let shouldPush = mayPush;
  const baseEntry: NotificationInboxEntry = {
    id: randomUUID(),
    category: payloadEvent.category,
    severity: payloadEvent.severity,
    title: payloadEvent.title,
    body: payloadEvent.body,
    createdAtUtc: now.toISOString(),
    delivery: shouldPush ? "pushed" : "inbox-only",
    readAtUtc: null,
    target: payloadEvent.target,
  };
  if (shouldPush) {
    shouldPush = await sendPush(device, baseEntry).catch(() => false);
  }
  const entry = shouldPush ? baseEntry : { ...baseEntry, delivery: "inbox-only" as const };
  await appendInbox(device.installationId, entry);
  await setDedupSeverity(device.installationId, event.eventId, String(event.severity));
  if (payloadEvent.eventId !== event.eventId) {
    await setDedupSeverity(device.installationId, payloadEvent.eventId, String(payloadEvent.severity));
  }
  await Promise.all(event.dedup.map((item) => setDedupSeverity(device.installationId, item.id, item.severity)));
  if (shouldPush) {
    await Promise.all([
      startCooldown(device.installationId, event.category, cooldownSeconds[event.category]),
      recordDelivery(device.installationId, "global", payloadEvent.eventId, now.getTime()),
      recordDelivery(device.installationId, event.category, payloadEvent.eventId, now.getTime()),
    ]);
  }
  return shouldPush;
}

async function dispatchSystemStatus(devices: DeviceRecord[], now: Date) {
  const event: CandidateEvent = {
    eventId: `system:stale:${utcDay(now)}`,
    category: "system",
    severity: "info",
    title: "Satellite data update delayed",
    body: "AgniVision.live has not received a fresh satellite-data update for about one hour. Previously loaded observations may be stale.",
    target: {},
    dedup: [],
  };
  await Promise.all(devices.filter((device) => device.preferences.masterEnabled && device.preferences.systemStatusEnabled).map((device) => deliver(device, event, now)));
}

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get("Authorization") !== `Bearer ${secret}`) return json({ error: "Unauthorized." }, 401);
    try {
      if (!(await acquireDispatchLock())) return json({ skipped: "A dispatch is already running." }, 202);
      await processPushReceipts().catch(() => undefined);
      const devices = await listDevices();
      const mapKey = process.env.FIRMS_MAP_KEY;
      if (!mapKey) return json({ error: "Satellite data service is not configured." }, 503);
      const now = new Date();
      const advisoryPromise = getOfficialAdvisories().catch(() => null);
      let detections: FireDetection[];
      try {
        detections = (await getDetections(mapKey, 5)).detections;
        await resetGlobalCounter("data-failures");
      } catch {
        const failures = await incrementGlobalCounter("data-failures", 24 * 60 * 60);
        if (failures === 6) await dispatchSystemStatus(devices, now);
        return json({ error: "Satellite data is temporarily unavailable.", consecutiveFailures: failures }, 502);
      }

      const dailyNational = new Map<string, number>([[utcDay(now), 0]]);
      detections.forEach((detection) => dailyNational.set(detection.acquiredAtUtc.slice(0, 10), (dailyNational.get(detection.acquiredAtUtc.slice(0, 10)) ?? 0) + 1));
      await Promise.all([...dailyNational].map(([day, count]) => setDailyRegionCount(day, "__national__", count)));
      const regional = await regionalEvents(detections, now);
      const advisoryResponse = await advisoryPromise;
      const approvedRegional: CandidateEvent[] = [];
      for (const event of regional) {
        const alreadyApproved = await getDedupSeverity("__global__", event.eventId);
        if (alreadyApproved) {
          approvedRegional.push(event);
          continue;
        }
        const ordinal = await incrementGlobalCounter(`regional-events:${utcDay(now)}`, 2 * 24 * 60 * 60);
        if (ordinal <= 2) {
          await setDedupSeverity("__global__", event.eventId, "info");
          approvedRegional.push(event);
        }
      }
      let pushed = 0;
      let logged = 0;

      for (const device of devices) {
        if (!device.preferences.masterEnabled) continue;
        const proximity = await proximityEvent(device, detections, now);
        const destinations = await destinationEvents(device, detections, now);
        const personal = [...(proximity ? [proximity] : []), ...destinations].sort((a, b) => eventPriority(b) - eventPriority(a));
        personal.push(...advisoryEvents(device, advisoryResponse?.advisories ?? []));
        personal.sort((a, b) => eventPriority(b) - eventPriority(a));
        const handledDetectionIds = new Set<string>();
        for (const event of personal) {
          if (event.dedup.some((item) => handledDetectionIds.has(item.id))) continue;
          pushed += (await deliver(device, event, now)) ? 1 : 0;
          logged += 1;
          event.dedup.forEach((item) => handledDetectionIds.add(item.id));
        }
        if (device.preferences.regionalHotspotsEnabled) {
          for (const event of approvedRegional) {
            pushed += (await deliver(device, event, now)) ? 1 : 0;
            logged += 1;
          }
        }
        const digest = await weeklyDigestEvent(device, detections, now);
        if (digest) {
          pushed += (await deliver(device, digest, now)) ? 1 : 0;
          logged += 1;
        }
      }
      return json({ devices: devices.length, detections: detections.length, logged, pushed });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Notification dispatch failed." }, 503);
    }
  },
};

import type { AdvisoryDataResponse, AdvisorySeverity, OfficialAdvisory } from "../src/types/advisory";
import { loadSachetSnapshot, saveSachetSnapshot, type SachetRecord, type SachetSnapshot } from "./_sachetStore";

const RSS_URL = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";
const CAP_URL = "https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 15 * 1000;
const MAX_FEED_ITEMS = 150;
const FETCH_CONCURRENCY = 10;

const STATE_NAMES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();
}

function tag(xml: string, name: string) {
  const match = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i").exec(xml);
  const value = match?.[1];
  return value === undefined ? undefined : decodeXml(value.replace(/<[^>]+>/g, ""));
}

function blocks(xml: string, name: string) {
  return [...xml.matchAll(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "gi"))].flatMap((match) => match[1] === undefined ? [] : [match[1]]);
}

function severity(value?: string): AdvisorySeverity {
  const normalized = value?.trim().toLowerCase();
  return normalized === "minor" || normalized === "moderate" || normalized === "severe" || normalized === "extreme" ? normalized : "info";
}

function coordinates(info: string) {
  const point = tag(info, "circle")?.split(/\s+/)[0] ?? tag(info, "polygon")?.split(/\s+/)[0];
  if (!point) return {};
  const values = point.split(",");
  const latitude = Number(values[0]);
  const longitude = Number(values[1]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {};
}

function locationParts(areaDescription?: string) {
  if (!areaDescription) return {};
  const parts = areaDescription.split(",").map((part) => part.trim()).filter(Boolean);
  const state = STATE_NAMES.find((name) => parts.some((part) => part.toLowerCase() === name.toLowerCase()));
  const stateIndex = state ? parts.findIndex((part) => part.toLowerCase() === state.toLowerCase()) : -1;
  const district = stateIndex > 0 ? parts[stateIndex - 1] : parts.length > 1 ? parts[parts.length - 2] : undefined;
  return { state, district: district && district !== state ? district : undefined };
}

export function parseSachetCap(xml: string): OfficialAdvisory | null {
  const infoBlocks = blocks(xml, "info");
  const info = infoBlocks.find((item) => /^en(?:-|$)/i.test(tag(item, "language") ?? "")) ?? infoBlocks[0];
  if (!info) return null;
  const sourceIdentifier = tag(xml, "identifier");
  const headline = tag(info, "headline");
  const event = tag(info, "event");
  const issuedAt = tag(xml, "sent");
  if (!sourceIdentifier || !headline || !event || !issuedAt) return null;
  const areaDescription = tag(info, "areaDesc");
  return {
    id: sourceIdentifier,
    event,
    category: tag(info, "category") ?? "Other",
    severity: severity(tag(info, "severity")),
    urgency: tag(info, "urgency"),
    certainty: tag(info, "certainty"),
    headline,
    description: tag(info, "description"),
    instruction: tag(info, "instruction"),
    ...locationParts(areaDescription),
    areaDescription,
    issuedAt,
    effectiveAt: tag(info, "effective"),
    expiresAt: tag(info, "expires"),
    issuingAuthority: tag(xml, "sender"),
    ...coordinates(info),
    source: "NDMA_SACHET",
    sourceIdentifier,
  };
}

function isRelevant(advisory: OfficialAdvisory) {
  return /(forest\s*fire|\bfire\b|landslide|flood|lightning|thunder|cyclone|avalanche|extreme|rain|weather)/i.test(`${advisory.event} ${advisory.headline}`);
}

function identifiersFromRss(xml: string) {
  return blocks(xml, "item").flatMap((item) => {
    const identifier = tag(item, "guid") ?? /[?&]identifier=([^&<]+)/i.exec(tag(item, "link") ?? "")?.[1];
    return identifier ? [identifier] : [];
  }).slice(0, MAX_FEED_ITEMS);
}

async function upstream(url: string, etag?: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: etag ? { "If-None-Match": etag } : undefined, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function updateRecord(identifier: string, existing: SachetRecord | undefined, checkedAt: string) {
  const response = await upstream(`${CAP_URL}${encodeURIComponent(identifier)}`, existing?.etag);
  if (response.status === 304 && existing) return { ...existing, lastCheckedAtUtc: checkedAt };
  if (!response.ok) throw new Error(`SACHET CAP returned HTTP ${response.status}.`);
  const xml = await response.text();
  const advisory = parseSachetCap(xml);
  return { fetchIdentifier: identifier, etag: response.headers.get("etag"), xml, advisory: advisory && isRelevant(advisory) ? advisory : null, lastCheckedAtUtc: checkedAt } satisfies SachetRecord;
}

async function mapConcurrent<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const result: R[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await worker(items[index]!);
    }
  }));
  return result;
}

function responseFrom(snapshot: SachetSnapshot): AdvisoryDataResponse {
  const now = Date.now();
  const advisories = Object.values(snapshot.records)
    .flatMap((record) => record.advisory ? [record.advisory] : [])
    .filter((advisory) => !advisory.expiresAt || Date.parse(advisory.expiresAt) > now)
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
  const hasSuccessfulFeed = Boolean(snapshot.lastSuccessfulFeedAtUtc);
  const lastCheckedAtUtc = snapshot.lastSuccessfulFeedAtUtc ?? snapshot.lastAttemptAtUtc ?? new Date(0).toISOString();
  const staleAge = now - Date.parse(lastCheckedAtUtc);
  return { advisories, fetchedAtUtc: snapshot.lastSuccessfulFeedAtUtc ?? lastCheckedAtUtc, lastCheckedAtUtc, isStale: !hasSuccessfulFeed || staleAge > REFRESH_INTERVAL_MS * 2, isUnavailable: !hasSuccessfulFeed || staleAge > STALE_THRESHOLD_MS };
}

export async function getOfficialAdvisories(force = false) {
  const snapshot = await loadSachetSnapshot();
  if (!force && snapshot.lastAttemptAtUtc && Date.now() - Date.parse(snapshot.lastAttemptAtUtc) < REFRESH_INTERVAL_MS) return responseFrom(snapshot);
  const checkedAt = new Date().toISOString();
  snapshot.lastAttemptAtUtc = checkedAt;
  try {
    const feed = await upstream(RSS_URL, snapshot.feedEtag);
    if (feed.status === 304) {
      snapshot.lastSuccessfulFeedAtUtc = checkedAt;
      await saveSachetSnapshot(snapshot);
      return responseFrom(snapshot);
    }
    if (!feed.ok) throw new Error(`SACHET RSS returned HTTP ${feed.status}.`);
    const identifiers = identifiersFromRss(await feed.text());
    if (identifiers.length === 0) throw new Error("SACHET RSS did not contain any alert identifiers.");
    snapshot.feedEtag = feed.headers.get("etag");
    const updates = await mapConcurrent(identifiers, async (identifier) => {
      try {
        return await updateRecord(identifier, snapshot.records[identifier], checkedAt);
      } catch {
        return snapshot.records[identifier];
      }
    });
    updates.forEach((record, index) => { const identifier = identifiers[index]; if (record && identifier) snapshot.records[identifier] = record; });
    const currentIdentifiers = new Set(identifiers);
    const retentionCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Object.entries(snapshot.records).forEach(([identifier, record]) => {
      const expiry = record.advisory?.expiresAt ? Date.parse(record.advisory.expiresAt) : Number.POSITIVE_INFINITY;
      if (!currentIdentifiers.has(identifier) && expiry < retentionCutoff) delete snapshot.records[identifier];
    });
    snapshot.lastSuccessfulFeedAtUtc = checkedAt;
    await saveSachetSnapshot(snapshot);
  } catch {
    await saveSachetSnapshot(snapshot);
  }
  return responseFrom(snapshot);
}

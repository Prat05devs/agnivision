# Agnivision — Official Advisories (NDMA SACHET) Integration Plan
### Audience: AI coding agent implementing the feature

---

## 1. Purpose & Source Verification

This adds a second, independent data source to Agnivision alongside NASA FIRMS:
**NDMA's SACHET** (National Disaster Alert Portal) — India's official Common
Alerting Protocol (CAP) system, publishing geo-targeted government warnings across
forest fire, flood, landslide, lightning, thunderstorm, cyclone, and other hazards.

**Independently verified before writing this plan** (not taken on faith from the
source spec): SACHET is a real, currently live NDMA/Government of India portal
(last updated 31 July 2026), and NDMA publishes an actual "Integration Guide for
Agencies" PDF that confirms the exact endpoint and caching contract used throughout
this document:

```
GET https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=<identifier>
```

with `ETag` / `If-None-Match` caching that NDMA's own documentation states is
**mandatory**, not optional best practice — their guide explicitly says consumers
"must" send the ETag, "must" reuse cached XML on a `304`, and describes this as
reducing load on their infrastructure. That mandate matters: this isn't a
performance nicety to get to later, it's a condition of being a well-behaved
consumer of a government system other agencies also rely on.

This document assumes the general shape of the source spec provided (backend
pipeline, data model, product surfaces) and formalizes it against the verified
source, integrated with what's already been built for Agnivision (the Notification
System plan and the Map plan).

---

## 2. Architecture — Two Independent Pipelines

```
NASA FIRMS                         NDMA SACHET
   ↓                                   ↓
Thermal detections                Official advisories
   ↓                                   ↓
        └──────────┬──────────────────┘
                    ↓
            Agnivision Backend
                    ↓
             React Native App
```

**SACHET is a new, independent provider module layered into the existing backend —
it does not touch the FIRMS/Google Maps pipeline.** These are two genuinely
different kinds of data (satellite-observed thermal anomalies vs. human-issued
government warnings) and should stay architecturally separate even where they
appear together on screen. Nothing in Phases 1–13 of the Thermal Map plan or the
Notification System plan should need to change to support this.

The app never calls SACHET directly from a phone — same reasoning as the FIRMS
pipeline: the backend fetches, caches, and normalizes; the app talks only to
Agnivision's own API.

---

## 3. Backend Ingestion Pipeline

```
SACHET RSS/CAP feed
        ↓
discover alert identifiers
        ↓
check existing identifier + cached ETag
        ↓
GET /cap_public_website/FetchXMLFile?identifier=<id>
   with If-None-Match: <cached-etag>
        ↓
   304 → reuse cached XML, do nothing further
   200 → parse new XML, replace cached XML + ETag
        ↓
normalize → deduplicate → store
        ↓
GET /api/advisories
```

- **Feed check cadence: every ~10 minutes.** Advisories aren't a sub-minute-latency
  concern the way a fast-moving detection might be, and polling more aggressively
  than that just adds unnecessary load against a system NDMA has explicitly asked
  consumers to be considerate of.
- **The ETag flow above is mandatory per NDMA's own integration guide, not a
  performance optimization to consider later.** Skipping it isn't "a simpler first
  version" — it's non-compliant with the terms NDMA has published for consuming
  this feed.
- Use the RSS/CAP feed for **discovery** of identifiers, and the `FetchXMLFile`
  endpoint for the **full content** of each one — these are two different calls
  with two different jobs, per NDMA's documented pattern.

---

## 4. Normalized Data Model

```ts
type OfficialAdvisory = {
  id: string;

  event: string;
  category: string;

  severity: "info" | "minor" | "moderate" | "severe" | "extreme";

  urgency?: string;
  certainty?: string;

  headline: string;
  description?: string;
  instruction?: string;

  state?: string;
  district?: string;
  areaDescription?: string;

  issuedAt: string;
  effectiveAt?: string;
  expiresAt?: string;

  issuingAuthority?: string;

  latitude?: number;
  longitude?: number;

  source: "NDMA_SACHET";
  sourceIdentifier: string;  // the original CAP identifier — keep this
                              // permanently, it's how dedup/re-fetch works
};
```

**This `severity` scale (info/minor/moderate/severe/extreme) is a different scale
from the existing FIRMS confidence tiers (Low/Nominal/High) and should never be
merged or cross-mapped into it.** They come from different authorities measuring
different things — one is a satellite confidence estimate, the other is an
official human-issued warning level. Keep them visually and conceptually distinct
throughout the app; don't reuse the Thermal Map plan's marker-tier color language
for advisory severity.

---

## 5. API Surface

```
GET /api/advisories
GET /api/advisories?state=Uttarakhand
GET /api/advisories?district=Dehradun
```

Straightforward filtered reads against the normalized, cached store — no client
ever talks to SACHET directly, per Section 2.

---

## 6. Product Surfaces

### 6.1 Home Screen

Directly beneath the map, a compact section — not a dashboard:

```
Official Advisories

┌───────────────────────────────┐
│ 🟠 Heavy Rain Warning         │
│ Dehradun, Uttarakhand         │
│ Valid until 8:30 PM           │
│ Issued 42 min ago          ›  │
└───────────────────────────────┘
```

Multiple advisories → a couple of cards plus "See all." None → *"No active
official advisories for your selected area."* — **never** *"Everything is safe"* —
same discipline already established for FIRMS empty states (original brief Section
38): absence of data is not a safety claim.

### 6.2 Destination Page

This is the highest-value surface — it sits right next to the existing "Recent
Thermal Activity" block a searched destination already shows (original brief
Sections 24–27), giving a tourist both signals in one place: what satellites are
observing, and what the government is actively warning about for that area.

### 6.3 Advisory Detail Screen

Severity, issued time, valid-until, affected area, description, instructions,
issuing authority, and explicit distribution provenance ("Distributed through NDMA
SACHET"). **Display the official description and instruction text as issued — do
not rewrite, soften, or rephrase government safety instructions into different
language.** This is the one place in the app where reproducing official wording
verbatim is correct, not a shortcut — Agnivision is acting as an authorized
redistribution channel for a government alert, not summarizing a third-party
article.

### 6.4 Map

**Do not add a full advisory layer to the thermal map initially.** Consistent with
the same "don't clutter the map" discipline already applied throughout the Thermal
Map plan — a compact floating indicator instead:

```
🟠 2 Official Advisories
```

Tap → advisory list/sheet. A dedicated advisory map layer is worth revisiting later
*only if* CAP data reliably includes usable polygons/coordinates for the areas
Agnivision covers — not a Phase 1 assumption.

### 6.5 Notifications — New Category

This slots into the **existing Notification System plan's taxonomy** as a new
category, alongside Proximity Alert, Destination Watch Alert, Regional Hotspot,
Digest, and System Status:

| Category | What it's for | Personalized? | Needs location? |
|---|---|---|---|
| **G — Official Advisory Alert** | A SACHET advisory is active for the user's current area or a watched destination | Yes | Either (works via Destination Watch even with location off, same as Category B) |

**Severity mapping onto the existing anti-spam/priority framework** (Notification
plan Section 8): `severe`/`extreme` behave like the existing High tier — prompt
delivery, allowed to override quiet hours, since these are literally official
government emergency warnings, the closest thing the app handles to a real safety
mandate. `moderate` behaves like Nominal. `minor`/`info` are not pushed by default,
same as Low-tier detections — visible in-app, opt-in for push.

Add to Settings, alongside the existing toggles:

```
Notifications
✓ Nearby thermal detections
✓ Destination watches
✓ Official advisories
```

An advisory affecting a watched destination should read like the map brief's other
notification copy — factual, sourced, no dramatization:

> *Official advisory near Mussoorie — heavy rain warning for Dehradun district,
> valid until 9:00 PM.*

---

## 7. Category Filtering

Don't surface every disaster type SACHET carries — prioritize what's relevant to a
wildfire/tourism-safety product: **Forest Fire, Fire, Landslide, Flood, Lightning,
Thunderstorm, Cyclone, Avalanche, Extreme weather.** Start with a single "All"
default and no filter UI cluttering Home — a filter sheet, if one is added at all,
comes later once it's clear people actually want to narrow the list.

---

## 8. Caching & Failure Behavior

- Store per identifier: the identifier itself, the current ETag, the parsed
  advisory, `lastCheckedAt`, `expiresAt`.
- Expired advisories drop out of the active list automatically but may remain in
  the notification inbox/history (Notification plan Section 11).
- **If SACHET is temporarily unreachable, don't blank out existing advisories.**
  Keep showing still-valid cached alerts with an honest freshness note —
  *"Last checked 18 min ago"* — same "don't fake certainty, don't fake absence"
  discipline as everywhere else in this app. Only show *"Official advisory data is
  temporarily unavailable"* once the cache is stale past a real threshold (start
  around 2–3 hours past last successful check — tune once real outage behavior is
  observed) — and even then, no crash, and never a fabricated "no alerts" state.

---

## 9. Phased Implementation Plan

### Phase 0 — Audit
- [ ] Inspect existing backend architecture and confirm where a new independent
      provider module fits without touching the FIRMS pipeline
- [ ] Fetch the live RSS/CAP feed once manually and confirm the actual identifier
      discovery format before writing a parser against assumptions
- [ ] Confirm the exact CAP XML fields available in a real sample response (severity,
      area, timestamps) against the `OfficialAdvisory` model in Section 4

### Phase 1 — Provider Module Skeleton
- [ ] Create `OfficialAdvisory` type (Section 4)
- [ ] Create a `SachetProvider` adapter as its own isolated module

### Phase 2 — Feed Discovery & Fetch
- [ ] Read the RSS/CAP feed, extract alert identifiers
- [ ] Implement the `FetchXMLFile?identifier=` call with full ETag/If-None-Match
      handling per Section 3 — both the `200` and `304` paths, tested against real
      responses, not just the happy path

### Phase 3 — Parsing & Normalization
- [ ] Parse CAP XML fields into `OfficialAdvisory`
- [ ] Normalize severity/category/location
- [ ] Deduplicate by `sourceIdentifier`

### Phase 4 — API
- [ ] Add `/api/advisories` with `state`/`district` filtering (Section 5)

### Phase 5 — Home & Detail Surfaces
- [ ] Home screen "Official Advisories" section (Section 6.1)
- [ ] Advisory list/detail screens (Section 6.3), verbatim official copy

### Phase 6 — Destination Integration
- [ ] Connect advisories to the destination page alongside existing thermal-activity
      data (Section 6.2)

### Phase 7 — Map Indicator
- [ ] Compact floating advisory-count indicator only (Section 6.4) — no full map
      layer yet

### Phase 8 — Notification Integration
- [ ] Add Category G to the existing notification taxonomy (Section 6.5), wired
      through the already-built dispatch/cooldown/quiet-hours framework rather than
      a parallel one
- [ ] Add the Settings toggle

### Phase 9 — Resilience
- [ ] Stale/error/loading states per Section 8
- [ ] Verify behavior under a simulated SACHET outage specifically — cached data
      should survive it gracefully

### Phase 10 — Tests & Docs
- [ ] Unit tests for the ETag cache logic (this is the part most likely to have a
      subtle bug — test the `304` path explicitly, not just `200`)
- [ ] Update project README with the new provider module

---

## 10. Acceptance Criteria

- [ ] A `304` response from SACHET never triggers a re-parse or re-store — cached
      data is reused exactly as NDMA's guide requires
- [ ] Advisories never appear cross-labeled with FIRMS confidence terminology, and
      vice versa — the two severity scales stay visually distinct
- [ ] Official description/instruction text is displayed as issued, unedited
- [ ] Home and destination screens never show "Everything is safe" — only factual
      presence/absence of active advisories
- [ ] A simulated SACHET outage shows a freshness-timestamped cached list, not a
      blank state or a crash
- [ ] Severe/extreme advisories for a watched destination or current-location match
      reach the user even during quiet hours, consistent with the existing High-tier
      notification behavior

---

## 11. Must Not Do

- Do not call SACHET directly from the mobile client — backend only (Section 2).
- Do not skip or "simplify away" the ETag caching flow — it's a stated requirement
  from NDMA, not an optional optimization.
- Do not rewrite or soften official advisory description/instruction text.
- Do not merge the CAP severity scale with the FIRMS confidence tier scale.
- Do not add a full advisory map layer in the first version.
- Do not build a second, parallel notification pipeline for advisories — extend the
  existing one (Notification System plan Section 13) rather than duplicating it.
- Do not immediately clear cached advisories the moment SACHET becomes unreachable.

---

## 12. Open Decisions for Product/Design Sign-off

1. Exact stale-cache threshold before showing "temporarily unavailable" (Section 8)
   — 2–3 hours is a starting guess, not a confirmed number.
2. Whether a future advisory map layer is worth building at all once real CAP
   polygon/coordinate data has been inspected (Section 6.4) — genuinely unknown
   until Phase 0's real-sample audit happens.
3. Final category filter list (Section 7) — confirm the hazard-type list against
   what SACHET actually publishes in practice, since documentation and live data
   don't always list every category with the same names.

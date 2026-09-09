---
document: Website & Landing Page Context
product: AgniVision
website: agnivision.live
audience: web designers, copywriters, legal reviewers, AI site builders
status: source of truth for the marketing site — NOT the engineering spec
---

# AgniVision — Website & Landing Page Context

## 0. How to use this file

This is the **website** source of truth: everything needed to design, write, and
legally complete the public landing page and its mandatory sub-pages.

It is a different document from `Agnivision-Context.md`, which is the *engineering*
source of truth. Do not merge them.

Every fact below was read out of the shipping codebase. Anything the code cannot
answer — company name, contact address, jurisdiction — is collected in
**§12 Open items** and marked `⚠️ NEEDS OWNER INPUT`. Those are blockers for the
legal pages; do not invent values for them.

---

## 1. Product identity

| Field | Value |
| --- | --- |
| Product name (launcher + store) | **AgniVision** |
| Brand / wordmark used in-app | **AgniVision.live** |
| Official website | `https://agnivision.live` |
| Android package | `live.agnivision.app` |
| iOS bundle identifier | `live.agnivision.app` |
| Version | 1.0.0 (Android versionCode 2) |
| Deep-link scheme | `agnivision://` |
| Platforms | Android and iOS |
| Developer | Prateek Thapliyal |
| Category | Weather / Maps & Navigation / News (public information) |
| Cost | Free. No ads, no in-app purchases, no subscriptions, no user accounts. |

**Brand colours in use** (pulled from the app's design tokens — use these so the site
matches the product):

| Token | Hex | Use |
| --- | --- | --- |
| Forest (primary) | `#14532D` | Primary buttons, headings, brand green |
| Forest accent | `#17633A` | Links, secondary emphasis |
| Charcoal | `#17251B` | Body text |
| Page surface | `#F8F9FC` | Page background |
| Thermal low | `#FF8708` | Data viz — low intensity |
| Thermal nominal | `#E05B1C` | Data viz — nominal intensity |
| Thermal high | `#9B2713` | Data viz — high intensity |
| Destination blue | `#2563EB` | Destination/tourism accents |

Typography in the app is **Inter** (weights 400/500/600/700/800/900). Using Inter on
the website will make the two feel like one product.

---

## 2. What the product actually is

> AgniVision takes satellite fire-detection data that already exists, combines it with
> a high-quality mobile map, and makes it understandable to ordinary citizens and
> travellers in India — with particular emphasis on Uttarakhand and its tourism
> ecosystem.

It is a **public-information app**. It is deliberately *not* a government operations
dashboard, an incident-management system, an emergency service, or a fire-prediction
platform.

### The single most important framing rule

The app treats a satellite detection as a **thermal anomaly observation** — never as a
verified fire, a fire perimeter, or a safety assessment. **The website must use exactly
the same framing.** This is a product-integrity rule and a liability boundary, not a
stylistic preference. See §5 for the prohibited-claims list.

---

## 3. Feature inventory (landing-page sections)

Each of these is implemented and shippable. Use them as candidate landing-page
sections or feature cards.

**1. Live India fire-detection map**
A native Google map of recent satellite thermal observations across India, rendered as
a continuous heat/density surface rather than numeric cluster badges. Individual
observations become tappable pins at close zoom. Filters for time window (24 hours /
3 days / 5 days), observation type, and confidence class.

**2. Official NDMA SACHET advisories**
Live government warnings (Common Alerting Protocol) — floods, thunderstorms, lightning,
and other hazards — fetched from the official NDMA SACHET feed, normalised, and shown
on Home, on destination pages, in a dedicated list/detail flow, and as a map indicator.
Official severity is never mixed with satellite confidence.

**3. Proximity alerts**
Opt-in notifications when a satellite observation is recorded near the user. User
controls the radius (5 / 10 / 25 / 50 km), the minimum confidence (All / Nominal+ /
High only), and quiet hours with an optional high-confidence override.

**4. Destination watches (tourism)**
32 curated Indian destinations. Users can follow a place and see a five-day / 50 km
activity summary for it. Works without location permission.

**5. Activity feed**
A filterable view of the current observation dataset with explicit loading, empty,
stale, and error states.

**6. Human-readable locations**
Satellite coordinates are reverse-geocoded into labels like "Near Malsi, Dehradun,
Uttarakhand" — always prefixed "Near" and always described as approximate.

**7. Shareable observation cards**
A branded PNG of any observation for the native share sheet or the photo gallery.

**8. Full source attribution**
Every observation exposes provider, dataset, satellite, instrument, raw confidence,
ingestion time, and product version in an expandable "Data Sources & Attribution"
panel.

---

## 4. Audience and messaging

**Primary audiences**
1. Residents of fire-prone regions, especially Uttarakhand
2. Domestic tourists and trekkers planning travel in India
3. Journalists, researchers, and environmentally engaged citizens

**Value propositions, in priority order**
1. Official satellite data, made readable — no GIS training required
2. India-wide coverage with real depth in Uttarakhand
3. Government advisories and satellite observations in one place
4. Alerts you control — radius, confidence, quiet hours
5. No account, no ads, no tracking, no personal data required

**Tone:** calm, precise, factual, public-service. Modern international
public-information product — explicitly *not* a government data portal, and explicitly
not alarmist. Never use fear to drive installs.

---

## 5. Prohibited claims ⚠️ read before writing any copy

These are hard rules. The app enforces them internally; the site must too.

**Never say or imply:**
- "Fire detected" / "fires near you" / "active fires" → say **satellite observation**,
  **thermal anomaly**, or **thermal detection**
- "Real-time" → satellite passes are periodic; say **recent** or **latest available**
- Any safety guidance, danger level, evacuation advice, or all-clear
- That zero results means an area is safe. A zero-result state means *no recent
  satellite detections were found*, nothing more.
- That confidence is a probability that a fire exists. It is a **source-data quality
  class**.
- That a location label is an ignition point, address, property, or incident boundary
- That AgniVision is an emergency service, or a substitute for one
- Any government endorsement, partnership, or affiliation. Using NDMA's public SACHET
  feed is not an endorsement by NDMA.

**Required disclaimer** — must appear on the landing page (footer at minimum) and in
the Terms. This is the app's own wording:

> AgniVision.live reports satellite detections and thermal anomalies — not verified
> ground incidents or safety clearances.

And for empty states:

> This does not mean the area is safe. Follow official local guidance.

**Emergency signpost.** Every page that discusses hazards should carry a line directing
users to official emergency services rather than to the app. ⚠️ Confirm the exact
numbers to publish with the owner (India: 112 general emergency, 101 fire).

---

## 6. Data sources and mandatory attribution

The website **must** credit these. Attribution is a licence condition, not a courtesy.

| Source | Used for | Attribution obligation |
| --- | --- | --- |
| **NASA FIRMS** (Fire Information for Resource Management System) | All satellite fire-detection observations, via MODIS and VIIRS instruments | Credit NASA FIRMS + the LANCE/ESDIS programme. Confirm current required wording at the FIRMS citation page before publishing. |
| **NDMA SACHET** (India National Disaster Management Authority) | Official CAP hazard advisories | Credit as the source. State plainly that this is a public feed and implies no endorsement or affiliation. |
| **Google Maps Platform** | Map rendering, Places autocomplete, reverse geocoding | Google's branding and attribution requirements apply; the Google logo must remain visible on any map screenshot. Google Maps/Google Earth Additional Terms of Service apply. |
| **Expo Push Service** | Push delivery (when configured) | No public attribution required; must be disclosed in the privacy policy as a processor. |
| **Vercel** | Web and API hosting | Disclose as a processor/subprocessor. |
| **Upstash Redis / Vercel KV** | Notification registration + inbox storage | Disclose as a processor/subprocessor. |

> Note: the destination photo gallery previously used Wikimedia Commons images. That
> feature has been **removed from the app**. Do not carry Wikimedia attribution into
> the site unless you reintroduce those images on the website itself — in which case
> Commons per-image licence and author attribution becomes mandatory.

---

## 7. Mandatory website pages

Google Play and the Apple App Store both require a reachable privacy policy URL before
review. These are the pages to build.

| Page | Required by | Must contain |
| --- | --- | --- |
| **Landing / Home** | — | Product explainer, features, screenshots, store badges, disclaimer, footer links |
| **Privacy Policy** | ✅ Play + App Store (hard blocker) | Everything in §8. Must be a public URL, no login, and live *before* store submission |
| **Terms of Service** | Strongly recommended | Disclaimer of warranties, "not an emergency service", acceptable use, limitation of liability, governing law |
| **Support / Contact** | ✅ Play requires a support contact | Working email address, expected response time |
| **Data Deletion** | ✅ Play (must be reachable, and linkable from the store listing) | How to delete stored data, what deletion covers, how long it takes. See §8.6 and the ⚠️ gap in §12 |
| **About** | Recommended | Who builds it, why, data philosophy |
| **Attributions / Data Sources** | ✅ Licence condition | Everything in §6 |

Recommended footer on every page: Privacy · Terms · Data Deletion · Support ·
Attributions · the §5 disclaimer line.

---

## 8. Privacy policy source data

This is the factual inventory. Everything here was verified against the code. A
reviewer still needs to turn it into policy prose — and ⚠️ **have it checked by someone
qualified in Indian data protection law** (DPDP Act 2023) before publishing.

### 8.1 Headline facts
- **No user accounts.** No sign-up, no email, no password, no name, no phone number.
- **No advertising, no ad SDKs, no analytics SDKs, no third-party trackers.**
- **No social login, no data brokers, no selling or sharing of personal data.**
- Identity is a random per-installation identifier, not a person.

### 8.2 Identifiers collected
| Item | Value | Where stored |
| --- | --- | --- |
| Installation ID | Random UUID generated on device | Device secure storage (Keychain / Android Keystore) + server |
| Device secret | Random token, used to authenticate the installation | Device secure storage; server keeps only a **hash** |
| Platform | `android` or `ios` | Server |
| Timezone offset | Minutes from UTC | Server |
| Push token | Expo push token, **only if** push is configured | Server |

The installation ID is **not** an advertising ID, is not linked to any account, and is
regenerated if the app is uninstalled and reinstalled.

### 8.3 Location data
- **Purpose:** to find satellite observations near the user and to power proximity
  alerts. Nothing else.
- **Precision:** coarse only. Coordinates are **rounded before upload**.
- **Route history:** none. Only the most recent coarse position is retained.
- **Background access:** starts **only** after the user explicitly enables background
  proximity in Settings. It is never on by default.
- **Retention:** coarse location expires server-side after **2 days**.
- **User control:** the user can disable nearby alerts and clear the stored location
  from within the app at any time.

Exact permission purpose strings shipped in the app — reuse these verbatim so the
policy matches the store listing and the OS prompts:

> **When in use:** "AgniVision.live uses your location to show nearby satellite
> detections and enable proximity alerts you choose."
>
> **Background:** "AgniVision.live uses a coarse background location to check for
> nearby satellite detections when proximity alerts are enabled."

### 8.4 Other data stored server-side
- Notification preferences (master toggle, proximity on/off, radius, minimum
  confidence, quiet hours, and per-category toggles)
- Watched destinations chosen by the user
- Notification inbox history

### 8.5 Retention periods (as implemented)
| Data | Retention |
| --- | --- |
| Notification inbox history | **180 days** |
| Coarse location | **2 days** |
| Delivery/pacing records | **2 days** |
| Push tickets | **2 days** |
| Observation data on device | Max 5 days or 2,500 newest observations, in memory only |

### 8.6 Permissions and why
| Permission | Purpose | Optional? |
| --- | --- | --- |
| Location (approximate/precise, foreground) | Nearby observations, proximity alerts | Yes |
| Location (background) | Proximity alerts while app is closed | Yes — explicit opt-in |
| Notifications | Deliver alerts the user enabled | Yes |
| Photo library (add only) | Save a shared observation image, on user request | Yes |
| Internet / network | Fetch satellite and advisory data | Required |
| Foreground service (location) | Android background proximity monitoring | Only with background opt-in |

### 8.7 Children
Not directed at children. ⚠️ Confirm the intended minimum age with the owner and state
it (this drives the Play Data Safety and App Store age-rating answers).

### 8.8 Data sharing
Personal data is **not** sold, rented, or shared for advertising. Data is processed
only by the infrastructure providers listed in §6 (Vercel, Upstash, and Expo's push
service when enabled), acting as processors.

---

## 9. Store compliance checklist

**Google Play Data Safety** — declare:
- Location: *Approximate location*, collected, **not** shared, optional, used for App
  functionality. Note it is transmitted and encrypted in transit.
- Device or other IDs: the installation ID, collected, not shared, App functionality.
- Data is encrypted in transit ✅
- Users can request deletion ⚠️ — see the gap in §12
- No data collected for advertising or analytics ✅

**Apple App Privacy ("nutrition label")** — expect:
- Coarse Location → App Functionality → **Not Linked to Identity**
- Identifiers (installation ID) → App Functionality → **Not Linked to Identity**
- **Not used for tracking** ✅

**Also required before submission**
- Privacy policy URL, publicly reachable, no login
- Support contact
- Foreground-service and background-location justification for Play review — the app
  uses background location strictly for user-enabled proximity alerts, which Play
  reviews closely. Prepare a short demo video showing the opt-in flow.

---

## 10. Website assets available

- App icon and adaptive icon: `public/Agnivision_App_Icon_Pack/`
- Logo/wordmark: rendered in-app by `AgnivisionLogo` / `AgniVisionBrand` — a flame-leaf
  mark in the thermal gradient beside "AgniVision.live" in forest green
- Screenshots suitable for the landing page: Home (map preview + live updates), full
  Map with heat surface, Official Advisories list, Advisory detail, Notification
  settings, Destination view
- ⚠️ Any screenshot containing a Google map must keep the Google logo visible

---

## 11. SEO and metadata starters

- **Title:** AgniVision — Satellite Fire Detection & Official Advisories for India
- **Meta description:** See recent satellite thermal observations across India
  alongside official NDMA advisories. Free, no account, no ads.
- **Keywords:** satellite fire detection India, NASA FIRMS India, forest fire map India,
  Uttarakhand forest fire, NDMA SACHET advisories, thermal anomaly map
- ⚠️ Avoid "live fire map" and "real-time fire alerts" in metadata — they contradict §5
  and misrepresent satellite pass cadence.

---

## 12. Open items ⚠️ NEEDS OWNER INPUT

These block the legal pages. The code cannot answer them and they must not be guessed.

1. **Legal entity name** — individual developer, or a registered company? Determines
   who the data fiduciary is.
2. **Contact email** for support and privacy enquiries. Play requires a working one.
3. **Registered address / jurisdiction** — needed for the governing-law clause and
   likely for the DPDP notice.
4. **Grievance officer** — Indian IT Rules 2021 and the DPDP Act have specific
   requirements around a named contact. Confirm applicability with counsel.
5. **Minimum age** for §8.7.
6. **Emergency numbers** to publish (§5).
7. **Full data-deletion path — GAP.** The app currently exposes deletion of *stored
   location* only. There is **no endpoint that deletes an installation's full record**
   (preferences, watches, inbox). Play expects a reachable deletion route. Either build
   that endpoint, or publish an email-based deletion process with a stated SLA and a
   documented manual procedure. **I recommend building the endpoint** — an email
   process is a standing manual obligation.
8. **Server-side notification storage is not currently provisioned.** The API needs
   `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_*`). Until set, device
   registration fails and nothing is stored server-side. This *narrows* what the
   privacy policy must presently describe — but write the policy for the intended
   configured state, and make sure the two match at launch.
9. **Push notifications are not configured** (no EAS project ID, no FCM credentials).
   Proximity alerts currently run entirely on-device. If the site claims push
   notifications, that claim must be true at launch. On-device alerting is arguably the
   stronger privacy story — consider saying so explicitly.

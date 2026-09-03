# Agnivision — Notification System Design & Implementation Plan
### Companion to: "AI Agent Brief — Agnivision Google Maps Experience" and
### "Agnivision — Thermal Map Implementation Plan"
### Audience: AI coding agent implementing the feature

---

## 1. Purpose & Philosophy

The map makes the data understandable when someone opens the app. Notifications are
what make the app *matter* when they haven't opened it — that's the entire premise
behind wanting this system, and it's correct: a monitoring app that only informs you
while you're already looking at it isn't really monitoring anything.

But this is also the single easiest part of the product to ruin. A wildfire-awareness
app that over-notifies teaches people to mute it, swipe it away unread, or uninstall
it — at which point it fails at the one moment it was built for. Every design choice
below is in service of one rule:

**A notification is only sent when it earns the interruption.**

Concretely, that means: severity-aware, rate-limited, deduplicated, honest about what
the data does and doesn't say (same terminology discipline as the map brief — no
"Confirmed Fire," no invented severity beyond what FIRMS actually reports), and
strictly opt-in for anything above the safety-critical minimum.

---

## 2. Notification Categories

Six categories, each with a distinct job. Not all are equally important — build them
in the order in Section 13, not the order listed here.

| # | Category | What it's for | Personalized to a person? | Needs location? |
|---|----------|----------------|----------------------------|------------------|
| A | **Proximity Alert** | A detection appeared near the user's actual current location | Yes | Yes |
| B | **Destination Watch Alert** | A detection appeared near a place the user chose to watch (trip planning) | Yes | No |
| C | **Regional Hotspot ("News") Alert** | A region is showing unusually elevated activity, India-wide | No (broadcast) | No |
| D | **Weekly Digest** | Calm, opt-in summary of national activity | No | No |
| E | **System / Data Status** | Rare — e.g. FIRMS data stale for an extended period | No | No |
| F | *(Explicitly not built)* Re-engagement / "come back" nudges | — | — | — |

**On F:** don't build this. It's standard growth-hacking practice for consumer apps,
and it's wrong for this one — every notification this app sends should be sendable
because something true and relevant happened, never because engagement dipped. This
also protects categories A and B: if the app ever sends a notification that turns out
to be filler, users lose trust in *all* of them, including the ones that matter.

---

## 3. Severity Tiers

Reuse the app's existing confidence taxonomy exactly as confirmed in the Activity
screen and formalized in the Thermal Map plan — **Low / Nominal / High** — nothing
new to invent here. Every category above that deals with individual detections
inherits this tiering.

| Tier | Default behavior |
|------|--------------------|
| **High** | Delivered promptly, higher-priority channel, allowed to override quiet hours (Section 9) |
| **Nominal** | Standard delivery, standard channel, respects quiet hours |
| **Low** | Not pushed by default — only included if the user explicitly opts into "all detections" in settings; otherwise it's visible in-app (Activity/Map) but doesn't interrupt |

---

## 4. Location Permission Handling

The three OS-level states the user described map to real, different capabilities —
the app should be honest about this in its own UI rather than silently failing.

| Permission | What's actually possible | What to tell the user |
|------------|---------------------------|-------------------------|
| **Always** | Full background Proximity Alerts — the backend can match new detections against the user's last known location even when the app is closed | "You'll get alerts even when the app is closed." |
| **While Using** | Proximity Alerts only while the app is open or recently backgrounded — the OS does not reliably deliver background location updates in this mode | "You'll get alerts while Agnivision is open. Switch to Always in Settings to get them in the background too." (Show once, contextually — e.g. the first time a nearby detection would have fired but couldn't — never nag on every launch.) |
| **Off** | No Proximity Alerts at all | Destination Watch, Regional Hotspot, and Digest still work fully — make sure the empty state explains this rather than just showing nothing. |

This state should be re-checked on every app foreground, not just at first launch —
OS-level permission can change outside the app at any time.

---

## 5. Category A — Proximity Alert

**Trigger:** a new or updated detection is ingested → falls within the user's
configured radius of their last known location → passes their minimum-severity
preference → passes dedup/cooldown (Section 8) → dispatched.

**Defaults** (tune with real usage data, not fixed):
- Radius options: 5 / 10 / 25 / 50 km, default **10 km**
- Minimum severity: default **Nominal and above**

**Aggregation:** if a single matching cycle produces multiple new detections for the
same user, send **one** notification, not one per detection:

> *3 new satellite detections within 10 km — closest 4 km, near Bhimtal.*

Never fan out five separate pushes for five points that appeared in the same refresh.

**Escalation (rare, handled carefully):** if a detection the user was already notified
about is later reclassified from Nominal to High confidence, one follow-up
notification is allowed, explicitly framed as an update, not a new event:

> *Update: a detection 6 km from you is now high confidence.*

No other re-notification of the same detection ID, ever, regardless of how many times
the underlying data refreshes.

---

## 6. Category B — Destination Watch Alert

This is the natural extension of the tourism flow already specced in the map brief
(destination search, "nearby detections" sheet). Add a **"Notify me about this
place"** action on the destination sheet:

- Creates a `WatchedDestination` (name, centroid, radius — default 25 km, matching the
  map brief's Section 28 default) tied to the user, independent of their live GPS
  location.
- Works fully with location permission **Off** — this is the category to point people
  toward if they don't want to share live location but still want to know about an
  upcoming trip's destination.
- Same tiering, aggregation, and cooldown rules as Proximity Alerts.
- Suggested nicety: if a watch has produced zero activity for ~30 days, a single soft
  check-in — *"Still want updates for Chopta?"* — rather than letting silent
  subscriptions accumulate forever unprompted.

---

## 7. Category C — Regional Hotspot ("News") Alert

This is the one you described as "a place with too much fire activity recently" — a
broadcast, editorial-feeling alert, not tied to any individual's location.

**Detection logic (starting heuristic — tune against real data before shipping):**
for each administrative region (district, or state if district-level detection
grouping isn't available), compare the trailing 24h detection count against a rolling
7-day baseline for that same region. Flag when **both**:
- absolute count exceeds a floor (e.g. 15) — so a quiet region spiking from 1→4 doesn't
  qualify, avoiding noise from small numbers, **and**
- it exceeds roughly 2.5× the trailing baseline — so genuinely unusual activity, not
  routine variation, is what gets surfaced.

**Copy, factual and specific, never dramatized:**

> *Increased satellite activity: Similipal, Odisha — 34 detections in the last 24
> hours, typically around 9.*

Tap → opens Map centered on that region.

**Frequency governance — this is the category most likely to become tabloid-feeling if
left unchecked:** cap hard at roughly 1–2 of these app-wide per day, only for genuinely
notable spikes. Default **on**, but clearly separated in Settings from personal safety
alerts (Category A/B) so a user never confuses "something happening far away" with
"something happening to me."

---

## 8. Anti-Spam Framework (cross-cutting — applies to every category)

This section is arguably more important than any individual trigger rule above.

- **Per-detection dedup:** never notify about the same detection ID twice, except the
  one explicit escalation case in Section 5.
- **Per-category cooldown:** minimum gap between notifications in the same category for
  the same user (tune per category; Proximity/Destination should be tighter than
  Regional Hotspot).
- **Rolling daily cap per user:** if Proximity Alerts alone would exceed roughly 5 in a
  rolling 24h window (e.g. during an unusually active period), stop pushing individual
  ones and switch to a single summary: *"12 more detections nearby today — view on
  map."* The app should never feel like it's flooding someone even when the underlying
  region genuinely is active.
- **Global daily cap across all categories combined**, with a priority order when the
  cap would otherwise be exceeded:

  `Proximity (High) > Destination Watch (High) > Proximity (Nominal) > Destination Watch (Nominal) > Regional Hotspot > Digest`

  Lower-priority items that lose out on push delivery still land in the in-app
  Notification Inbox (Section 11) — nothing is silently discarded, it's just not
  interruptive.
- **In-app inbox as the release valve:** because everything is logged in-app
  regardless of whether it was pushed, the dispatch system can afford to be
  conservative about interrupting people — the information isn't lost, just paced.

---

## 9. Quiet Hours

Default: mute Nominal-tier Proximity/Destination alerts and all Regional Hotspot /
Digest notifications between **10 PM – 7 AM** local device time. High-tier Proximity
and Destination alerts are allowed to override quiet hours by default, since those
represent the closest thing this app has to a safety-relevant event — but this
override should be a visible, user-controlled setting, not a hidden default the user
can't turn off.

---

## 10. Notification Copy Rules

Same discipline as the map brief's terminology section, applied to push copy:

- "Satellite Detection" / "Thermal Anomaly" — never "Confirmed Fire."
- Counts are "detections," never "fires" (original brief Section 41's rule applies
  here word-for-word).
- No invented claims — no spread direction, no severity beyond the confidence tier, no
  "danger level," no evacuation language. If FIRMS didn't report it, the notification
  doesn't say it.
- No ALL CAPS, no exclamation-point urgency, no siren language. Calm and specific reads
  as more credible than alarmed, and credibility is the entire product.
- Structure: **Title** = what + where. **Body** = distance, time observed, tier,
  source (VIIRS/MODIS). **Tap** → deep-links into the Map, centered and zoomed on the
  relevant detection or cluster, honoring the map's existing "preserve state" principle
  (Thermal Map plan Section — camera should land intentionally, not just teleport to
  India).

---

## 11. In-App Notification Inbox

Every dispatched notification (pushed or not, per the caps in Section 8) is logged and
visible inside the app — a simple reverse-chronological list, most naturally placed
under the existing **More** tab. This does two jobs: it's the release valve described
in Section 8, and it gives the app a durable record even if a system notification was
swiped away unread.

---

## 12. User-Facing Settings

- Master notifications toggle
- **Proximity Alerts:** radius selector, minimum severity (All / Nominal+ / High only)
- **Destination Watches:** manage saved places
- **Regional Hotspot / News:** on/off
- **Weekly Digest:** on/off
- **Quiet hours:** on/off, custom range, High-tier override toggle
- **Location permission status**, in plain language per the Section 4 table, with a
  direct link into OS settings

---

## 13. Technical Architecture

### 13.1 Why this needs a server component

Registering a native geofence per detection isn't viable — Android caps around 100
geofences per app, iOS around 20 monitored regions, and this app can have thousands of
active detections nationwide at once. Geofencing APIs are the right tool for a handful
of fixed, known regions; they are the wrong tool for "any of thousands of dynamically
changing points, anywhere in India."

The correct shape: the **client** periodically shares a coarse, battery-conscious
location update (Android `FusedLocationProviderClient` with significant-change
semantics; iOS Significant-Change Location Service — not continuous GPS polling) with
a **backend**, which already holds the full normalized detection dataset from the
existing FIRMS pipeline. The backend does the spatial matching — that's a much cheaper
and more scalable problem for a server holding both datasets than for thousands of
individual devices trying to watch a moving target list. The backend then dispatches
via a push service.

**Recommended push service:** Firebase Cloud Messaging (FCM) — one integration path
that delivers to Android natively and bridges to APNs for iOS, avoiding maintaining two
separate push pipelines.

### 13.2 New/extended components

- **Device registration:** push token, platform, notification preferences, last-known
  coarse location, list of watched destinations.
- **Spatial index:** geohash bucketing (simplest to add incrementally) or a proper
  spatial extension (e.g. PostGIS `ST_DWithin`) if the backend already has a relational
  store with room for one — needed in both directions: "which users are near this new
  detection" and "which watched destinations are near this new detection."
- **Matching engine:** hooks into the existing normalization pipeline (the same
  `FireDetection[]` output the map already consumes, per the original brief's
  architecture section) — on each new batch, runs Proximity matching, Destination
  Watch matching, and Regional Hotspot aggregation.
- **Dispatch service:** applies per-user preferences, cooldowns, caps, and quiet hours
  from Sections 8–9, builds the payload per Section 10, sends via FCM, writes to the
  audit log.
- **Delivery/audit log:** backs both the cooldown/dedup logic and the in-app inbox from
  Section 11.
- **Notification channels (Android) / categories (iOS):** one per category listed in
  Section 2, so a user (or the OS) can mute one category without muting all of them.

### 13.3 Privacy notes

Store only the location precision actually needed for the coarsest configured radius
option (a full precise GPS trail is not necessary for "within 10 km" matching — a
geohash of appropriate length is enough and is meaningfully more private). Give users a
way to clear stored location data and revoke Always permission from inside the app's
own Settings, not only through the OS.

---

## 14. Phased Implementation Plan

Build in this order — Destination Watch (Phase 3) is deliberately scheduled before
Proximity (Phase 4) because it validates the entire dispatch pipeline end-to-end
without needing background location plumbing yet, which is the highest-risk, most
platform-fiddly part of this whole feature.

### Phase 0 — Audit & Decisions
- [ ] Confirm whether any push infrastructure already exists in the project (Firebase
      project, APNs certs, existing token storage) — extend it rather than duplicating
- [ ] Confirm backend data store and whether a spatial extension is available or needs
      adding
- [ ] Confirm current permission-request flow and copy for location/notifications
- [ ] Write a short implementation note confirming the plan before writing feature code

### Phase 1 — Preferences Data Model + Settings UI
- [ ] Build the settings screen from Section 12, wired to a real preferences store —
      no live alerts yet, this just proves the data model and UI
- [ ] Location permission status display per Section 4, re-checked on every foreground

### Phase 2 — Push Infrastructure Plumbing
- [ ] FCM project setup, APNs bridging for iOS
- [ ] Device registration endpoint + token refresh handling
- [ ] Notification permission prompts (iOS/Android), contextual — not fired on first
      launch before the user has any reason to want them
- [ ] Notification channels (Android) / categories (iOS) per Section 13.2

### Phase 3 — Destination Watch Alerts
- [ ] "Notify me about this place" action on the destination sheet (map brief Section
      27)
- [ ] `WatchedDestination` storage + management UI
- [ ] Matching engine hook for destination-watch matching only (proximity comes next)
- [ ] Dispatch through the full pipeline: preferences → cooldown → cap → quiet hours →
      FCM → in-app inbox entry
- [ ] This phase is the one to fully verify end-to-end before adding location
      complexity

### Phase 4 — Proximity Alerts
- [ ] Background location plumbing per Section 13.1 (significant-change, not
      continuous polling), respecting the Always/While-Using/Off distinction from
      Section 4
- [ ] Spatial matching engine extended to live user locations
- [ ] Escalation handling (Section 5)
- [ ] Verify real behavior in all three permission states on both platforms — this is
      the single highest-risk area for platform divergence in the whole feature

### Phase 5 — Anti-Spam Framework
- [ ] Aggregation, per-category cooldowns, rolling daily cap, global priority ordering,
      quiet hours (Sections 8–9) — implement and load-test against a simulated
      high-activity period before shipping, not just against a quiet dataset

### Phase 6 — Regional Hotspot Detection
- [ ] Rolling-baseline anomaly detection per region (Section 7)
- [ ] Frequency governance cap
- [ ] Copy review against Section 10's terminology rules

### Phase 7 — Weekly Digest
- [ ] Lowest priority — build only once A–C are stable

### Phase 8 — In-App Inbox & Deep Linking
- [ ] Notification history list under **More**
- [ ] Tap-through from a system notification lands the Map in the correct, intentional
      camera position — not a jarring teleport to the India overview

### Phase 9 — Cross-Platform QA, Battery, Privacy Review
- [ ] Full flow tested identically on Android and iOS: permission grant/deny/downgrade
      mid-use, background delivery, foreground delivery, tap deep-linking
- [ ] Battery impact measured with background location active over a multi-hour period
- [ ] Privacy review: confirm stored location precision matches Section 13.3, confirm
      users can clear/revoke from in-app Settings

---

## 15. Acceptance Criteria

- [ ] A user with Always location gets a Proximity Alert for a new High-tier detection
      within their configured radius, worded per Section 10, without the app open
- [ ] A user with While Using location sees the honest capability message from Section
      4 and still gets alerts while the app is open/recently backgrounded
- [ ] A user with location Off gets zero Proximity Alerts but can still use Destination
      Watch successfully
- [ ] Five simultaneous new detections near one user produce one aggregated
      notification, not five
- [ ] No detection ID ever triggers more than one notification, except a single
      allowed escalation
- [ ] A simulated high-activity day does not exceed the rolling daily cap for any user
- [ ] A Regional Hotspot alert only fires when both the absolute and relative
      thresholds from Section 7 are met, and never more than the daily app-wide cap
- [ ] Every dispatched notification (delivered or capped) appears in the in-app inbox
- [ ] Tapping any notification opens the Map in a correct, intentional camera position
- [ ] No notification anywhere in the system uses "fire," "confirmed," or dramatized
      language in place of "detection" / "satellite detection" terminology

---

## 16. Additions to the "Must Not Do" List

- Do not build generic re-engagement/marketing notifications (Section 2, Category F).
- Do not register a native geofence per detection — doesn't scale (Section 13.1).
- Do not send more than one notification for the same detection ID outside the single
  defined escalation case.
- Do not exceed the per-user rolling cap or the global daily cap, even during
  unusually active periods — switch to summary/batched copy instead.
- Do not let Regional Hotspot alerts imply personal risk to the reader — that's what
  Proximity and Destination Watch are for; keep the framing informational.
- Do not store precise continuous location history beyond what's needed for
  radius-matching at the coarsest configured option.
- Do not override quiet hours for anything below High tier.

---

## 17. Open Decisions for Product/Design Sign-off

1. Exact radius default and options for Proximity Alerts (Section 5) — 10 km is a
   reasonable starting point but should be sanity-checked against how spread out real
   detections tend to be near populated areas.
2. Exact Regional Hotspot thresholds (Section 7) — the 15-count floor / 2.5× baseline
   heuristic needs to be run against real historical FIRMS data for India before it's
   trusted to gate a broadcast notification.
3. Whether High-tier alerts should request iOS's Time-Sensitive interruption
   entitlement (requires separate Apple approval) or just use a standard high-priority
   notification.
4. Whether Low-confidence detections should ever be push-eligible by default —
   recommendation in this plan is no, opt-in only, but worth confirming against how
   noisy Low-confidence data actually is in practice.
5. Final per-category cooldown windows and the global daily cap number (Section 8) —
   set conservatively at first and loosen based on real complaint/mute-rate data rather
   than guessing generous defaults upfront.

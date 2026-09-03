# Agnivision — Thermal Map Implementation Plan
### Companion to: "AI Agent Brief — Agnivision Google Maps Experience"
### Audience: AI coding agent implementing the feature

---

## 1. Purpose of This Document

The original brief defines the map's information hierarchy, camera behavior, clustering
logic, and interaction model. That structure stays intact — it does not need to be
rebuilt here.

This document adds and replaces exactly one thing: **the visual language of the
markers and clusters.**

Specifically, it removes:
- 🔥 emoji or any literal flame iconography
- flat, default-looking colored circles
- anything that reads as "a developer dropped a pin on a map"

And replaces it with:
- a **Thermal Signal** system — a soft, glowing, Snapchat Snap Map–style heat indicator
  whose size and intensity scale with a 3-tier fire severity classification, rendered
  with restrained, premium motion.

Everything in the original brief's sections on camera behavior, search, filters,
performance, and acceptance testing still applies. Where this document is silent,
defer to the original brief.

---

## 1.1 Geographic Scope — India Only

Stated explicitly here rather than only implied, since this document should hold up on its own even if the original brief isn't open side-by-side: Agnivision's map is India-specific, not a global map. The detection dataset (FIRMS) is filtered to India, the initial camera fits India (not the world), and this scope should be enforced consistently everywhere the map touches geography, not just at first load:

Clustering and detection rendering operate only on India-scoped data — there is no expectation of showing, or being able to pan/zoom to see, fire activity in other countries.
Destination search (Phase 9 below) should be biased/restricted to Indian results. Left unrestricted, a general-purpose Google Places search will happily return "Paris" or "Cairo" — a technically valid result that leads to an empty, confusing screen since there's no data to show there. Bias the Places API query to India (e.g. a country restriction / location bias toward Indian bounds) so suggestions are relevant to what the app can actually answer questions about.
Camera bounds: the India-fit camera on load (original brief Section 5) is the starting point, not a hard limit — a user can still pan/zoom freely if they want to, the map just shouldn't invite or default to a world view, and shouldn't render clusters/markers outside India even if the viewport happens to scroll past its borders.
If a future version of the product expands beyond India, that's a distinct scope change requiring its own brief — nothing in this plan should be built in a way that assumes or hints at multi-country support prematurely.

## 2. Visual Language Directive

No emoji. No stock pin icons. No photographic or illustrated flame artwork, anywhere —
not in markers, not in clusters, not in bottom sheets, not in toasts, not in empty
states.

The reference feel is **Snapchat's Snap Map heat visualization**: locations with more
activity don't get a bigger icon, they get a warmer, larger, softer glow. Nothing on
that map looks like a sticker. The heat *is* the information.

Agnivision's version of that concept is called the **Thermal Signal**. It has three
visual layers, described in Section 3.2, and it always degrades gracefully into a
clean numeric badge — the glow is atmosphere, the number/dot is the actual data.

---

## 3. The Thermal Signal System

### 3.1 Fire Intensity Levels — Classification

Every normalized detection gets an `intensityLevel` of `1`, `2`, or `3`, computed once
at the data-normalization layer (not in the UI layer).

**Correction from an earlier draft of this document:** the app already has a curated,
already-displayed, already-filterable confidence field with exactly three values — Low,
Nominal, High (visible in the Activity screen's "Confidence class" filter). That field
is the classifier. There's no need for a separately invented FRP-threshold system —
doing so would create two parallel severity taxonomies that could disagree with each
other and would need to be re-tuned against real data before shipping. Use the existing
field directly:

| Level | Label   | Source                                    |
|-------|---------|--------------------------------------------|
| 1     | Low     | `confidence === "low"`                     |
| 2     | Nominal | `confidence === "nominal"`                 |
| 3     | High    | `confidence === "high"`                    |

This also directly satisfies the original brief's Section 34 requirement that Map and
Activity share the same filter taxonomy — they now literally share the same field and
the same three labels, with no translation layer between them.

`frp` is still stored and still shown in the detail sheet (original brief Section 20)
as a data point — it's just no longer the thing that decides which visual tier a
detection renders in.

**Cluster-level intensity** = the intensity level of the *single highest* member
detection in that cluster, not an average. A cluster containing one severe detection
among twenty mild ones should still read as attention-worthy — averaging it away would
hide the most important point on the map. Cluster **size** (glow radius) is separately
influenced by detection *count*, so density and severity are both visible but not
conflated.

Store both `frp` and `intensityLevel` on the normalized `FireDetection` object, and
recompute an aggregated `{ intensityLevel, count }` whenever a cluster is built.

### 3.2 Visual Design Spec

Each Thermal Signal is three stacked layers:

```
        ░░░░░░░░░░░        ← Layer 1: soft blurred glow (halo)
       ░░░░░░░░░░░░░          radius/opacity scale with level (+ count for clusters)
      ░░░░┌───────┐░░░
      ░░░░│  ring  │░░░    ← Layer 2: thin identity ring
      ░░░░│ ┌─────┐│░░░       0 rings = Level 1, 1 ring = Level 2, 2 rings = Level 3
      ░░░░│ │  27  ││░░░       (accessibility: level is legible without color)
      ░░░░│ └─────┘│░░░
      ░░░░└───────┘░░░    ← Layer 3: solid core (dark forest/charcoal), houses the
       ░░░░░░░░░░░░░          count (clusters) or a small bright dot (single detection)
        ░░░░░░░░░░░
```

| Level | Name     | Core dot / count color | Glow color (low→high opacity gradient) | Ring | Motion |
|-------|----------|--------------------------|------------------------------------------|------|--------|
| 1     | Low      | Muted amber              | Soft amber, low opacity, small radius    | none | static |
| 2     | Nominal  | Warm orange               | Orange, medium opacity, medium radius    | 1 thin ring | static, or a barely-perceptible glow shift on appear |
| 3     | High     | Deep orange-red           | Red-orange, higher opacity, largest radius | 2 concentric rings | slow "breathing" glow, opacity 0.7 → 1.0, 2.5–3s ease-in-out loop — a hotspot *signal*, not a pulsing alarm |

Rules that keep this from tipping into "gamey" or "alarmist":
- Never use pure saturated red for anything below Level 3.
- The Level 3 breathing animation must be slow and low-contrast enough that it reads as
  "this place is active" — not as an emergency klaxon. If in doubt, halve the opacity
  delta.
- Glow opacity must never fully occlude road names or the destination pin underneath
  it. Cap peak glow opacity well short of solid fill.
- Exact hex values should come from Agnivision's existing theme file (the
  green/forest + fire-orange identity already established elsewhere in the app) —
  don't invent a new arbitrary palette. If no existing tokens fit, propose new ones for
  design sign-off rather than shipping guesses.

### 3.3 Accessibility

Per the original brief's Section 50 ("Don't encode confidence only through marker
color"), intensity must be legible through **at least two non-color channels**:
glow size and ring count. Color is the third, reinforcing channel — never the only one.
The existing list-view equivalent (Section 50 of the original brief) should show the
intensity label as text ("Low / Nominal / High") for screen readers.

### 3.4 Clusters vs. Individual Detections

- **Cluster** (Levels A–C of the original zoom hierarchy): glow + ring(s) + core badge
  with numeric count, using the aggregated intensity rule above.
- **Individual detection** (Levels D–E): same layer structure, but the core is a small
  solid dot instead of a numeric badge — no count needed for a single point.
- **Selected state** (either type): scale core 1.0 → 1.15, add a slightly brighter
  outer edge to the existing ring. Do not introduce a new color language for
  "selected" — it should look like the same signal, focused.

---

## 4. Technical Rendering Strategy

This is the part most likely to make or break performance, so it deserves an explicit
recommendation rather than leaving it fully open like the original brief's Section 45.

**Problem:** true blurred radial-gradient glows are expensive if rendered as one custom
React view per marker, especially with hundreds of points on screen — this conflicts
directly with the original brief's Section 42–45 guidance (prefer lightweight image
markers, avoid heavy per-marker View trees).

**Recommended hybrid, to evaluate against the actual project:**

- **The glow layer** should be built from `react-native-maps`' native `Circle` overlay
  primitive (2–3 stacked circles per point, decreasing radius, increasing opacity) —
  these are rendered by the native map SDK itself, not as React views, so they scale to
  large counts far better than custom marker components. This also gives a nice side
  effect: at high zoom (Levels D–E), a meter-based circle radius will visually grow and
  shrink correctly as the user zooms, exactly like Snap Map's heat blobs do — the glow
  is geographically anchored, not a fixed sticker.
- **At low zoom (Levels A–B),** a geo-anchored circle would render as an invisible
  speck or, worse, a screen-covering blob at extreme zoom-out — meter-based radius
  doesn't read well at country/region scale. Use a **fixed-size pre-rendered glow
  image** (3 levels × a small number of count-size buckets) as the marker icon instead,
  same visual language, different rendering path.
- **The core badge/dot** (Layer 3, the actual tap target) stays a small, cheap marker —
  either a tiny pre-rendered bitmap per level or a minimal native marker view. It's
  small enough that render cost stays low even as a custom view.
- Circle overlays are decorative only and should not be tap targets — the marker itself
  (Layer 3) owns the tap/select interaction, so a mis-tap on the edge of a glow doesn't
  select the wrong thing.

Before committing to this, the agent should confirm current `react-native-maps`
version and Fabric/New Architecture status (as instructed in the original brief's
Section 43) — `Circle` overlay support and performance characteristics can vary across
versions and platforms, so verify on both Android and iOS early rather than assuming.

---

## 5. Updated Data Model

Extends the original brief's `FireDetection` and `MapState` — additions only, nothing
removed.

```ts
type FireDetection = {
  // ...existing normalized fields (id, coordinates, satellite, sensor,
  // confidence, brightness, observedAt, etc.)
  frp: number | null;              // Fire Radiative Power, MW — from FIRMS
  intensityLevel: 1 | 2 | 3;       // computed at normalization time, see 3.1
};

type ClusterNode = {
  id: string;
  bounds: LatLngBounds;
  centroid: Coordinate;
  count: number;
  intensityLevel: 1 | 2 | 3;       // max of member detections, see 3.1
  memberIds: string[];
};
```

`MapState` (from the original brief's Section 57) needs no structural change —
intensity is a property of the data, not of map state.

---

## 6. Phased Implementation Plan

Implementation proceeds in four-phase batches. During each phase, perform only the
lightweight checks needed to confirm the code is coherent and safe to continue; do not
repeat the full test/configuration suite after every phase. At the end of each batch,
run the complete non-native verification pass, review the combined behavior, and fix
any regressions before starting the next batch:

- Gate 1: Phases 1–4
- Gate 2: Phases 5–8
- Gate 3: Phases 9–12
- Gate 4: Phase 13 and final acceptance

Phase 0 remains the initial audit and planning checkpoint. Native compilation and
physical-device checks are separate release gates and must only run when explicitly
authorized. High-risk rendering work may still receive a focused check inside its
batch when necessary, but it should not trigger the full suite early.

### Phase 0 — Audit & Environment Prep
- [ ] Inspect existing project structure, current FIRMS data model, and how Detection
      Details currently receives detection objects
- [ ] Confirm React Native version, `react-native-maps` version, Fabric/New
      Architecture status, Android + iOS Google Maps configuration
- [ ] Confirm whether `Circle` overlays are viable given the above (Section 4)
- [ ] Locate existing Agnivision theme/design tokens (colors, spacing) to reuse for
      Thermal Signal palette — do not introduce a parallel token system
- [ ] Produce a short written implementation note confirming the plan before writing
      feature code

### Phase 1 — Base Map Renders Correctly
- [ ] Google Map loads and renders on Android and iOS (physical device or simulator,
      not just one platform)
- [ ] Camera fits India on load per original brief Section 5
- [ ] No markers yet — this phase only proves the map itself is solid

### Phase 2 — Data Normalization + Intensity Classification
- [ ] Extend the normalization pipeline to compute `frp` and `intensityLevel` per
      Section 3.1
- [ ] Unit-test the classification function against a range of real FRP/confidence
      combinations pulled from actual FIRMS data, not synthetic guesses
- [ ] No UI changes yet — verify the data layer in isolation (log/inspect output)

### Phase 3 — Single Detection Thermal Signal (no clustering yet)
- [ ] Render one real detection using the full 3-layer Thermal Signal (Section 3.2) at
      a fixed test location, all three intensity levels
- [ ] Validate visually on both platforms before scaling up — this is the cheapest
      point to catch a design/perf problem
- [ ] Confirm glow doesn't obscure basemap legibility (Section 3.2 opacity cap)

### Phase 4 — All Normalized Points, No Clustering
- [ ] Render the full current dataset as individual Thermal Signals, unclustered
- [ ] Purely to confirm data flow end-to-end and to observe real-world density before
      designing cluster bucket sizes — expect this to look messy, that's expected and
      temporary

### Phase 5 — Clustering Engine
- [ ] Evaluate clustering approach per original brief Section 45 (native utility vs.
      JS/supercluster-style) against current project reality — don't adopt a package
      solely because it exists
- [ ] Implement viewport-aware, zoom-aware cluster computation (original brief Section
      46), with `onRegionChangeComplete` + short debounce (Section 47), not
      recalculating on every pixel of pan
- [ ] Cluster output includes aggregated `intensityLevel` and `count` per Section 3.1

### Phase 6 — Thermal Cluster Rendering
- [ ] Apply the Section 3.2 glow + ring + count-badge treatment to clusters
- [ ] Implement the fixed-image-glow (low zoom) vs. geo-anchored-circle-glow (high
      zoom) split from Section 4, keyed to the original brief's zoom Levels A–E
- [ ] Confirm cluster count always reflects detection count, and that any tooltip/label
      language says "detections," never "fires" (original brief Section 41)

### Phase 7 — Zoom Hierarchy & Cluster Transition
- [ ] Implement the cluster-splits-as-you-zoom behavior (original brief Sections 12–13)
      using the Thermal Signal visuals — glow should scale/fade smoothly, not pop
- [ ] Cluster tap animates camera to fit cluster bounds (Section 11), 300–500ms
- [ ] Verify no frame drops with the glow layer active during pinch gestures — this is
      the highest-risk performance point in the whole feature

### Phase 8 — Marker Selection & Bottom Sheet Sync
- [ ] Tap → selected state (scale 1.0→1.15 on core, brighter ring edge, Section 3.4)
- [ ] Camera offsets upward so the marker isn't hidden behind the sheet (original brief
      Section 18)
- [ ] Detection preview sheet and expanded view per original brief Sections 19–22,
      including the intensity label rendered as text for accessibility (Section 3.3)

### Phase 9 — Destination Search
- [ ] Google Places search, destination marker visually distinct from any Thermal
      Signal (original brief Sections 24–26)
- [ ] Nearby-detections situation sheet (Section 27), radius visualization only shown
      when relevant (Section 28)

### Phase 10 — Current Location
- [ ] Permission flow, GPS point, camera animation (original brief Section 23) — no
      background tracking

### Phase 11 — Filter Synchronization
- [ ] Map filters share state with Activity screen (original brief Sections 32–35)
- [ ] Filter changes transition existing data locally where possible, no blank-then-
      repopulate flash (Section 33)

### Phase 12 — Performance Hardening
- [ ] Profile with a realistic large dataset (hundreds–low thousands of points)
- [ ] Confirm glow rendering strategy from Section 4 holds up under load; fall back to
      simpler glow (fewer stacked circles, or drop to badge-only at extreme density) if
      frame rate suffers — smooth gestures beat decoration (original brief Section 14)
- [ ] Verify memoization, no marker re-render on unrelated state changes

### Phase 13 — Tablet, Accessibility, Cross-Platform QA
- [ ] Responsive layout per original brief Sections 48–49
- [ ] Screen-reader labels for all controls and for intensity level text (Section 3.3)
- [ ] Full flow (load, pan, pinch, cluster tap, marker tap, sheet, search, location,
      filters, back navigation) tested identically on Android and iOS — not "works on
      Android, iOS later" (original brief Section 64)
- [ ] Sweep the codebase and every string resource for emoji or literal flame imagery —
      this should be a zero-result search before ship

---

## 7. Additions to the "Must Not Do" List

On top of the original brief's Section 55 list:

- Do not use 🔥 or any emoji in markers, clusters, sheets, toasts, or labels.
- Do not use literal flame icons, photographic fire imagery, or smoke graphics.
- Do not use pure saturated red for Level 1 or Level 2 signals.
- Do not let glow opacity fully occlude the basemap beneath it.
- Do not animate the breathing glow on Level 1 or Level 2 — reserve motion for Level 3
  only, and keep it subtle.
- Do not encode intensity level through color alone — size and ring count must also
  carry the information.
- Do not treat glow circles as tap targets — the core badge/dot owns interaction.

---

## 8. Acceptance Criteria — Thermal System

In addition to the original brief's Sections 58–64:

- [ ] The three intensity levels are distinguishable at a glance without reading the
      count — by size and ring count alone, with color as reinforcement
- [ ] No emoji or flame artwork exists anywhere in the shipped UI (verified by a
      codebase/string search, not just a visual spot-check)
- [ ] Glow rendering does not measurably reduce frame rate during pinch/pan with a
      realistic dataset loaded
- [ ] Cluster intensity always reflects the highest-severity member, verified against
      at least one real multi-detection cluster
- [ ] Screen reader announces intensity level as text for both clusters and individual
      detections

---

## 9. Open Decisions to Confirm Before/During Build

These are called out explicitly rather than silently assumed, so the agent should flag
them for product/design sign-off rather than guessing silently:

1. ~~Exact FRP thresholds for the 3 levels~~ — resolved: classification now uses the
   app's existing `confidence` field directly (Section 3.1), no thresholds to tune.
2. Exact color tokens for the three glow/ring/core states — should be pulled from or
   added to the existing Agnivision theme, not invented fresh.
3. Whether cluster glow size should scale with count on a continuous curve or snap to a
   small number of discrete size buckets (discrete buckets are cheaper to pre-render as
   fixed images for the low-zoom path in Section 4).
4. Final confirmation of the `Circle`-overlay rendering strategy against the specific
   `react-native-maps` version in use, once Phase 0's audit is complete.

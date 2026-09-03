# AgniVision.live — Thermal Map Implementation Plan
### Companion to: "AI Agent Brief — AgniVision.live Google Maps Experience"
### Audience: AI coding agent implementing the feature

> **Current density revision (2026-09-03):** The implemented product direction now
> supersedes this plan's numeric regional marker layer. Regional and district groups
> are rendered as an equal-per-observation heat-density surface with no black count
> badges. Tapping near a heat cluster still drills into its member bounds, and sparse
> individual observations remain tappable at close city zoom. Heat points are checked
> against the India boundary before rendering. See `MAP_IMPLEMENTATION.md` for the
> current behavior; the older two-layer passages below are retained as design history.

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

And replaces it with a **two-layer system** (Section 3): a continuous, Snap
Map–style density heat layer underneath, and the existing discrete numeric marker
badges on top of it.

Everything in the original brief's sections on camera behavior, search, filters,
performance, and acceptance testing still applies. Where this document is silent,
defer to the original brief.

### 1.1 Geographic Scope — India Only

Stated explicitly here rather than only implied, since this document should hold up
on its own even if the original brief isn't open side-by-side: **AgniVision.live's map is
India-specific, not a global map.** The detection dataset (FIRMS) is filtered to
India, the initial camera fits India (not the world), and this scope should be
enforced consistently everywhere the map touches geography, not just at first load:

- **Clustering and detection rendering** operate only on India-scoped data — there is
  no expectation of showing, or being able to pan/zoom to see, fire activity in other
  countries.
- **Destination search** (Phase 9 below) should be biased/restricted to Indian
  results. Left unrestricted, a general-purpose Google Places search will happily
  return "Paris" or "Cairo" — a technically valid result that leads to an empty,
  confusing screen since there's no data to show there. Bias the Places API query to
  India (e.g. a country restriction / location bias toward Indian bounds) so
  suggestions are relevant to what the app can actually answer questions about.
- **Camera bounds**: the India-fit camera on load (original brief Section 5) is the
  starting point, not a hard limit — a user can still pan/zoom freely if they want to,
  the map just shouldn't invite or default to a world view, and shouldn't render
  clusters/markers outside India even if the viewport happens to scroll past its
  borders.
- If a future version of the product expands beyond India, that's a distinct scope
  change requiring its own brief — nothing in this plan should be built in a way that
  assumes or hints at multi-country support prematurely.

---

## 2. Visual Language Directive

No emoji. No stock pin icons. No photographic or illustrated flame artwork, anywhere —
not in markers, not in clusters, not in bottom sheets, not in toasts, not in empty
states.

**Revision based on reference screenshots of Snap Map itself:** the earlier draft of
this document approximated the glow as a per-marker halo built from stacked shapes.
The actual reference images make clear that's not the right model. What Snap Map
actually shows is **one continuous, soft, irregular density surface** — a real
Kernel Density Estimation (KDE) heatmap with a red→orange→yellow→green→cyan→
transparent gradient — with small, separate, sharply-defined avatar/POI markers
sitting on top of it. The blobs are not circles or rings around a badge; they're
organic, blurred, and blend into each other where activity is close together. The
markers on top are a completely different, crisp visual language from the soft blob
underneath them.

That maps cleanly onto **two layers** for AgniVision.live, described fully in Section 3:

1. **The Heat Layer** — an ambient, continuous, non-interactive density surface,
   rendered underneath everything else. This carries the "wow, this looks like Snap
   Map" visual.
2. **The Marker Layer** — the existing discrete, tappable badges (dark circle + white
   count, already largely built) sitting on top. This carries the precise,
   accessible, tap-to-inspect information.

This is good news for scope: the marker work already done doesn't need to be redone.
The gap was the heat layer underneath it, which didn't exist yet.

---

## 3. The Two-Layer Thermal System

### 3.1 Layer 1 — Marker Tiers (unchanged, still drives the badge layer)

Every normalized detection still gets an `intensityLevel` of `1`, `2`, or `3`, mapped
directly from the app's existing confidence field — no change from the prior draft:

| Level | Label   | Source                                    |
|-------|---------|--------------------------------------------|
| 1     | Low     | `confidence === "low"`                     |
| 2     | Nominal | `confidence === "nominal"`                 |
| 3     | High    | `confidence === "high"`                    |

This satisfies the original brief's Section 34 requirement that Map and Activity
share the same taxonomy, and it's what the marker badge/ring still uses (Section 3.3).

`frp` (Fire Radiative Power) is still stored on the normalized detection and still
shown in the detail sheet (original brief Section 20) as a data point — it doesn't
drive the marker tier, but it does feed into the heat layer's weighting below.

**Cluster-level intensity** = the intensity level of the *single highest* member
detection in that cluster, not an average — unchanged reasoning from the prior draft.

### 3.2 Layer 2 — Hotness Weight (new, drives the heat layer only)

The heat layer needs something the marker layer doesn't: a continuous number per
detection, not a 3-value tier, since it's rendering a smooth gradient rather than a
discrete badge color. Call this `hotnessWeight`, computed at render time (not stored
— see the note at the end of this section) as:

```
hotnessWeight = severityWeight(confidence) × recencyDecay(age)
```

**`severityWeight`** — a simple numeric version of the same three tiers already in use:

| Confidence | severityWeight |
|------------|------------------|
| Low        | 1.0              |
| Nominal    | 2.0              |
| High       | 3.5              |

(High is weighted more than double Low rather than linearly, so a handful of
high-confidence detections can register as clearly hotter than a larger number of
low-confidence ones — tune this ratio once it's visible against real data.)

**`recencyDecay(age)`** — detections should fade out of the heat layer gradually as
they age, not disappear at a hard cutoff the way the 24h/3d/5d filter does today.
Starting curve (an exponential decay tuned to roughly hit these anchor points — tune
against how it actually looks, not treat as exact):

| Age | recencyDecay |
|-----|----------------|
| 0h (just observed) | 1.00 |
| 1h  | 0.90 |
| 4h  | 0.65 |
| 12h | 0.25 |
| 24h | ≈ 0.00 |

**Important: `hotnessWeight` is never stored as a static value on the detection
object.** Because it depends on `age`, a value computed once and cached would go
stale the moment time passes. Compute it fresh at render time from `observedAt` and
`confidence` — this is cheap (one multiplication per point) and is what keeps the
heat layer visibly "breathing" as data ages, without needing a background job to
update stored records.

### 3.3 Visual Spec — Heat Layer

Continuous gradient, matching the reference screenshots — this is the actual "wow"
layer:

| Stop | Color | Meaning |
|------|-------|----------|
| 0.00 | transparent | no activity |
| 0.20 | cyan/blue | faint |
| 0.40 | green | light |
| 0.60 | yellow | moderate |
| 0.80 | orange | elevated |
| 1.00 | red | intense |

This full rainbow ramp — not a warm-colors-only palette — is deliberate: it's what
the reference images actually show, it gives far more visual range for a smooth KDE
surface than a 3-color warm ramp would, and it's a genuinely honest read here, unlike
Snap Map's version of it: AgniVision.live's red doesn't mean "lots of social posts," it
means "elevated fire radiative power was actually measured here." Blue/green reading
as "calm" and red reading as "hot" is also just the correct, familiar convention from
thermal imaging generally — nothing about adopting it is alarmist.

Peak opacity should stay well short of fully solid (per the reference images, the
basemap remains faintly visible even through the reddest core) — this also directly
supports the accessibility split in Section 3.5.

**This heat layer needs the basemap to be more restrained than a default map style,**
more so than the original brief's Section 36 already asked for — a colorful default
basemap will visually fight a full rainbow gradient on top of it. Lean toward the
muted, low-saturation land/water styling the reference Snap Map screenshots use.

### 3.4 Visual Spec — Marker Layer (mostly already built)

The existing dark charcoal badge + white count, sitting on top of the heat layer, is
close to correct as-is and doesn't need a rebuild:

- **Cluster:** dark core, white count, optional thin ring colored by the cluster's
  Section 3.1 tier (kept lightweight now that the heat layer carries the main visual
  weight — this no longer needs its own glow/halo, that job now belongs to Layer 1).
- **Individual detection:** same core, small solid dot instead of a count.
- **Selected state:** scale 1.0 → 1.15, brighter ring edge — unchanged.

No emoji, no flame icons, no photographic textures — unchanged from Section 2.

### 3.5 Accessibility — Why the Split Matters

The heat layer is explicitly **decorative and ambient** — it is not the source of
truth for any specific number, and color-only encoding is acceptable there precisely
*because* it isn't the only place the information lives. The marker layer above it
remains the actual accessible source of truth: count, confidence label as text ("Low
/ Nominal / High"), and screen-reader support all live there, unchanged from the
original brief's Section 50 requirement not to encode confidence through color alone.
Splitting these two jobs across two layers resolves the earlier tension between
"looks like Snap Map" and "accessible" — the ambient layer is allowed to be pure
color because the marker layer never is.

---

## 4. Technical Rendering Strategy

**This is simpler than the earlier draft of this document proposed**, and worth
flagging clearly: `react-native-maps` — the library already in use — ships a native
`Heatmap` component. It's backed by Google's own heatmap utility libraries on both
platforms, does genuine GPU-accelerated KDE-style rendering (weighted points in, a
smooth density surface out), and takes exactly the gradient config described in
Section 3.3 (`radius`, `opacity`, `gradient: { colors, startPoints, colorMapSize }`).

This replaces the earlier recommendation to fake a glow by stacking `Circle`
overlays — that was a reasonable workaround when the assumption was "no native
heatmap layer exists," but one does, and it's the right tool: it does the density
aggregation *internally*, so at AgniVision.live's actual data scale (hundreds to low
thousands of points nationwide — nowhere near Snap's scale) **no custom tiling or
server-side aggregation pipeline is needed for this layer.** Feed it the current
filtered dataset directly and let the SDK render it.

**One hard dependency: this component only renders through the Google Maps
provider, not Apple's native MapKit provider.** The current build (per the "MapKit
Preview · Google Maps build pending" banner already visible in testing) is running
on MapKit on iOS — the heat layer will not appear at all until the pending Google
Maps integration is finished on both platforms. This makes finishing that
integration a hard prerequisite for this feature, not a parallel-track nice-to-have.

### 4.1 Feeding the heat layer

- Points: every currently-filtered detection's coordinate, with `weight =
  hotnessWeight` from Section 3.2, computed fresh on each render pass (or at least
  each data refresh / filter change) — not cached statically, per the staleness note
  in 3.2.
- This is a separate data feed from the marker layer's cluster computation — the heat
  layer wants every raw point with a continuous weight, the marker layer wants
  clustered/aggregated discrete points. They're built from the same underlying
  dataset but shaped differently for their respective renderers.
- Radius and gradient: start from the ranges in Section 3.3, expect to tune both
  against how it actually looks on-device — this is very much a "look at it and
  adjust" parameter, not something to compute from first principles.

### 4.2 Marker layer performance (unchanged guidance from the prior draft)

The marker layer (Section 3.4) is unaffected by this change and keeps its original
performance guidance: prefer lightweight/pre-rendered marker images over heavy
per-marker View trees (original brief Sections 42–45), confirm current
`react-native-maps` version and Fabric/New Architecture status before committing to
an exact implementation (original brief Section 43), and test on both platforms
early rather than assuming Android success implies iOS success.

---

## 5. Updated Data Model

Extends the original brief's `FireDetection` and `MapState` — additions only, nothing
removed.

```ts
type FireDetection = {
  // ...existing normalized fields (id, coordinates, satellite, sensor,
  // confidence, brightness, observedAt, etc.)
  frp: number | null;              // Fire Radiative Power, MW — from FIRMS
  intensityLevel: 1 | 2 | 3;       // marker-layer tier, see 3.1 — stored
  // hotnessWeight is intentionally NOT a stored field — compute it at render
  // time from confidence + observedAt (see 3.2), since a cached value goes
  // stale as soon as time passes
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

Each phase should be built, run, and verified before moving to the next — this mirrors
the incremental approach the original brief requires in its Section 66. Do not collapse
phases to save time; the glow/perf work in particular is much easier to debug in
isolation.

### Phase 0 — Audit & Environment Prep
- [ ] Inspect existing project structure, current FIRMS data model, and how Detection
      Details currently receives detection objects
- [ ] Confirm React Native version, `react-native-maps` version, Fabric/New
      Architecture status, and — critically — finish resolving Android + iOS Google
      Maps provider configuration (the heat layer in Section 4 depends on it and
      won't render on MapKit)
- [ ] Confirm the installed `react-native-maps` version includes the `Heatmap`
      component (Section 4) on both platforms
- [ ] Locate existing AgniVision.live theme/design tokens (colors, spacing) to reuse
      alongside the Section 3.3 gradient — do not introduce a parallel token system
- [ ] Produce a short written implementation note confirming the plan before writing
      feature code

### Phase 1 — Base Map Renders Correctly
- [ ] Google Map loads and renders on Android and iOS (physical device or simulator,
      not just one platform) — via the Google Maps provider specifically
- [ ] Camera fits India on load per original brief Section 5
- [ ] No markers or heat layer yet — this phase only proves the map itself is solid

### Phase 2 — Data Normalization + Intensity Classification
- [ ] Extend the normalization pipeline to compute `frp` and `intensityLevel` per
      Section 3.1
- [ ] Unit-test the classification function against a range of real confidence values
      pulled from actual FIRMS data, not synthetic guesses
- [ ] No UI changes yet — verify the data layer in isolation (log/inspect output)

### Phase 3 — Heat Layer Proof of Concept (build this before the marker layer)
- [ ] Render the native `Heatmap` component against the full current dataset, with
      `weight = hotnessWeight` computed per Section 3.2 and the gradient from Section
      3.3
- [ ] Validate visually on both platforms before anything else is layered on top —
      this is the single highest-value, highest-risk visual to get right early, and
      it's now genuinely simple to stand up since the SDK does the density math
- [ ] Confirm the basemap is muted enough for the gradient to read clearly (Section
      3.3) — expect to need a basemap style adjustment here, not just a heat-layer one

### Phase 4 — Marker Layer, Unclustered
- [ ] Render the full current dataset as individual markers (Section 3.4), on top of
      the now-working heat layer from Phase 3, unclustered
- [ ] Purely to confirm marker data flow end-to-end and observe real-world density
      before designing cluster bucket sizes — expect this to look messy, that's
      expected and temporary
- [ ] Spot-check marker legibility sitting on top of red/orange heat regions — the
      dark badge should hold contrast, but verify rather than assume

### Phase 5 — Clustering Engine (marker layer only — the heat layer needs no clustering)
- [ ] Evaluate clustering approach per original brief Section 45 (native utility vs.
      JS/supercluster-style) against current project reality — don't adopt a package
      solely because it exists
- [ ] Implement viewport-aware, zoom-aware cluster computation (original brief Section
      46), with `onRegionChangeComplete` + short debounce (Section 47), not
      recalculating on every pixel of pan
- [ ] Cluster output includes aggregated `intensityLevel` and `count` per Section 3.1
- [ ] Note: the heat layer from Phase 3 does not need this clustering pipeline at all
      — it keeps consuming the full raw dataset directly, since the native component
      handles density aggregation internally

### Phase 6 — Marker Badge Rendering
- [ ] Apply the Section 3.4 badge/ring treatment to clusters and individual
      detections
- [ ] Confirm cluster count always reflects detection count, and that any tooltip/label
      language says "detections," never "fires" (original brief Section 41)
- [ ] This phase is considerably smaller than originally scoped — most of the visual
      weight now comes from Phase 3's heat layer, not from per-marker glow work

### Phase 7 — Zoom Hierarchy & Cluster Transition
- [ ] Implement the cluster-splits-as-you-zoom behavior for the marker layer
      (original brief Sections 12–13) — badges should transition smoothly, not pop
- [ ] Cluster tap animates camera to fit cluster bounds (Section 11), 300–500ms
- [ ] Confirm the heat layer updates its point feed as the filtered/visible dataset
      changes with zoom, and that it does so smoothly alongside the marker
      transitions rather than visibly lagging behind them

### Phase 8 — Marker Selection & Bottom Sheet Sync
- [ ] Tap → selected state (scale 1.0→1.15 on core, brighter ring edge, Section 3.4)
- [ ] Camera offsets upward so the marker isn't hidden behind the sheet (original brief
      Section 18)
- [ ] Detection preview sheet and expanded view per original brief Sections 19–22,
      including the intensity label rendered as text for accessibility (Section 3.3)

### Phase 9 — Destination Search
- [ ] Google Places search, destination marker visually distinct from any Thermal
      Signal (original brief Sections 24–26)
- [ ] Search results biased/restricted to India per Section 1.1 — verify a query for
      a well-known non-Indian place (e.g. "Paris") does not surface as a top
      suggestion
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
- [ ] Confirm the heat layer holds up under load — it's a native, GPU-rendered
      component so this is lower-risk than the marker layer, but verify rather than
      assume; if it struggles, reducing the point count fed to it (e.g. capping to
      the most recent/highest-weight N points) is the fallback, not disabling it
- [ ] Verify marker-layer memoization, no marker re-render on unrelated state changes

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
- Do not let the heat layer's peak opacity fully occlude the basemap beneath it.
- Do not store `hotnessWeight` as a static field — it must be computed fresh from
  `observedAt` and confidence, or the heat layer will show stale intensity as time
  passes (Section 3.2).
- Do not encode marker intensity through color alone on the badge layer — the heat
  layer is allowed to be color-only because it's decorative; the marker layer is not,
  since it's the accessible source of truth (Section 3.5).
- Do not attempt to render the heat layer on the Apple MapKit provider — it requires
  the Google Maps provider (Section 4) and will silently fail to appear otherwise.
- Do not build a custom tiling/aggregation pipeline for the heat layer — the native
  component handles this internally at AgniVision.live's data scale (Section 4).

---

## 8. Acceptance Criteria — Thermal System

In addition to the original brief's Sections 58–64:

- [ ] The heat layer renders as a continuous, blurred gradient (not rings or discrete
      shapes) that visibly matches the reference Snap Map screenshots' character
- [ ] The heat layer visibly fades as data ages, without needing a manual refresh, per
      the recency decay curve in Section 3.2
- [ ] No emoji or flame artwork exists anywhere in the shipped UI (verified by a
      codebase/string search, not just a visual spot-check)
- [ ] Marker badges remain legible (sufficient contrast) when sitting directly on top
      of a red/orange region of the heat layer
- [ ] Cluster intensity always reflects the highest-severity member, verified against
      at least one real multi-detection cluster
- [ ] Screen reader announces intensity level as text for both clusters and individual
      detections, independent of the heat layer entirely

---

## 9. Open Decisions to Confirm Before/During Build

These are called out explicitly rather than silently assumed, so the agent should flag
them for product/design sign-off rather than guessing silently:

1. ~~Exact FRP thresholds for the 3 levels~~ — resolved: classification now uses the
   app's existing `confidence` field directly (Section 3.1), no thresholds to tune.
2. ~~Circle-overlay rendering strategy~~ — resolved: superseded by the native
   `Heatmap` component (Section 4), pending only the Google Maps provider migration
   already required.
3. Exact `severityWeight` ratios and the `recencyDecay` curve shape (Section 3.2) —
   the starting numbers are a reasonable guess but should be tuned by actually
   looking at the rendered heat layer against real data, not computed analytically.
4. Exact heat-layer `radius`/`opacity`/gradient `startPoints` (Section 3.3/4.1) —
   same story, tune by eye once it's on a real device.
5. Exact color tokens for the marker badge/ring (Section 3.4) — should be pulled from
   or added to the existing AgniVision.live theme, not invented fresh.
6. Whether the basemap needs a genuinely custom style (Google Cloud Map Styling) to
   get the muted look the heat layer needs, or whether toning down the existing style
   is sufficient — worth a quick visual test before committing to building a full
   custom style.

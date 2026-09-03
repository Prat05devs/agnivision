# AgniVision.live Map Implementation Note

## Phase 0 decision

AgniVision.live uses React Native 0.86.3, `react-native-maps` 1.27.2, and the New Architecture/Fabric. Android edge-to-edge is enabled. Google Maps configuration is supplied through the official `react-native-maps` Expo config plugin and reads the platform-restricted keys from uncommitted environment variables.

The map uses a viewport-aware, zoom-aware grid clustering engine maintained inside the repository. With a maximum retained dataset of 2,500 records, this avoids adopting an outdated React Native clustering wrapper while keeping cluster output deterministic and independently testable. The engine filters a buffered viewport, progressively reduces its cell size across the India, regional, and district zoom levels, reveals individuals at city zoom, and retains density clustering above 350 visible records.

Thermal Signals use a density-first system. A native Google `Heatmap` receives every currently filtered India-scoped observation and renders a continuous surface. Every observation contributes one equal unit, so nearby observations accumulate into progressively warmer colors instead of being represented by numeric cluster badges. The gradient runs transparent→cyan→green→yellow→orange→red at 0.68 opacity and radius 38 on the full Map (32 on the compact Home preview); its warm stops begin earlier so medium-density areas peak yellow/orange while the strongest density cores reach red.

The grid engine remains viewport-aware for rendering performance and drill-down behavior, but regional clusters are represented only by the heat surface—no black numeric badges are drawn. Tapping near a heat cluster still fits its member coordinates. At close city zoom, sparse individual observations remain tappable as compact dot markers so users can open observation details.

Current upstream reports for this exact maps/Fabric generation include platform-specific custom-marker and iOS overlay issues. The implementation therefore keeps marker trees minimal, disables continuous marker view tracking, caps high-density rendering, and treats physical Android/iOS validation as mandatory before release. Earlier Google-enabled iOS simulator and Android arm64 artifacts verified the base map integration; the newer continuous heat layer remains pending native visual QA.

## India-only enforcement

- FIRMS requests use the India bounding box to limit the upstream response, then normalization applies a stricter point-in-boundary check before any observation can enter the app or notification dataset.
- The mainland outline uses Natural Earth’s public-domain simplified admin-0 geometry. Conservative local bounds retain Lakshadweep and Andaman and Nicobar observations omitted by that low-resolution outline.
- Clustering repeats the same boundary check as defense in depth, so camera panning outside India cannot render neighboring-country observations.
- Heat-point construction repeats the boundary check as well, preventing neighboring-country data such as Sri Lanka from leaking into the density surface even if an upstream envelope response is broader than India.
- Places Autocomplete uses an India country restriction.
- Place Details coordinates are checked against the same India boundary before returning to the app.
- Camera panning remains unrestricted; leaving India simply produces no AgniVision.live detection overlays.

## Data and interaction flow

`provider data → normalized FireDetection → shared Zustand filters → equal-weight India heat points + buffered drill-down nodes → density surface and close-zoom details`

Map state—including camera region, selected detection/destination, and shared time/observation-type/confidence filters—lives outside the Map component so navigation and tab changes do not reset geographic context. The Home preview consumes that same state and data instead of issuing a duplicate request. Heat-cluster taps fit member coordinates, detection taps at close zoom offset the camera above the preview sheet, and destination selections animate to a regional zoom with a distinct blue marker and 25 km situation radius. Marker presses stop propagation before the map-level interaction handler runs. The native heat layer performs density rendering independently from the drill-down pipeline.

Visible observations request human-readable locality context through the server-only
`/api/detection-areas` reverse-geocoding proxy. The mobile client batches up to 12
coordinates, coalesces nearby points into roughly 5 km locality cells, and caches the
resolved labels for the session; a warm server instance caches cells for 24 hours.
Only India-scoped coordinates are accepted. Labels begin with “Near” and appear on
Home, Activity, Map selection, full details, screen-reader descriptions, and share
cards. If geocoding is unavailable, the existing nearest-reference calculation stays
visible, so area-name enrichment cannot block the observation feed.

The floating controls include explicit India reset, equivalent Activity-list access,
refresh, and current-location actions with screen-reader labels. The list transition
preserves shared filters. Destination context includes the count, nearest distance,
latest observation, and a direct route to the nearest loaded detection. Empty-area
messaging reflects the active time window without claiming an absence of fires.

Activity cards expose the same textual intensity label announced by map markers and a
dedicated “Show on map” action. That action restores the chosen detection, camera
target, and shared filters. Destination context has an explicit close button, map-tap
dismissal, and Android Back dismissal before the user leaves the Map tab.

Map readiness and location-permission failures have visible, accessible status. The
Google provider uses a low-saturation AgniVision.live style that reduces commercial
POI, transit-icon, road, and terrain noise while keeping boundaries, major roads,
water, and city labels readable below the rainbow heat surface. The earlier Google
base styling and attribution were visually confirmed in an iOS Simulator build.
The continuous heat layer was added afterward and still requires native visual QA.
MapKit preview intentionally retains the native Apple basemap, does not render the
Google-only heat layer, and is only an explicit development fallback.

Camera requests from destination search, Activity, and notification routing are
one-shot commands consumed only after the map reports ready. Stored user location or
destination state never re-centers the camera merely because the user returned to the
Map tab. The location button animates only after that explicit action succeeds.

An expandable density guide explains the green/yellow/orange/red progression and
states that the surface compares concentrations of filtered satellite observations,
not confirmed fire boundaries. If
the native map does not become ready within ten seconds, the loading state changes to
an accessible explanation and retry action; retry remounts only the map surface while
preserving camera and filter state.

The cluster-to-detection lookup is indexed once per dataset for heat-cluster drill
down instead of repeatedly scanning the full feed. Phone layouts use a bottom sheet; sufficiently wide landscape
layouts place details on the right and keep map controls clear of the panel.

Places requests use the server-only `GOOGLE_PLACES_API_KEY`. Autocomplete is debounced, uses a per-search session token, and is restricted to the `in` region. The app never receives the key and can fall back to its curated India destination list when the proxy is unavailable.

## External completion requirements

The locally supplied platform keys were injected into earlier native projects and artifacts. That iOS simulator app built, installed, and visually loaded the Google provider with Google attribution, the styled basemap, live data, and clustered Thermal Signals. The earlier Android arm64 release APK passed package, ABI, manifest, ZIP, and signature checks; Android runtime rendering was not claimed because no Android device or emulator was available. Branding, map-first Home, attribution controls, and the continuous heat layer were implemented after those artifacts and were deliberately not rebuilt.

Physical Android and iOS devices must still validate map load, Fabric marker/overlay behavior, gesture performance, location denial, search, state restoration, accessibility, notification routing, and phone/tablet layouts before store release. The Android test-release APK is signed with the generated debug certificate and needs production signing before Play distribution.

Development-mode iOS uses Google Maps by default. Set
`EXPO_PUBLIC_IOS_MAPKIT_PREVIEW=true` only when inspecting an older simulator binary
that does not contain the Google Maps SDK configuration. That labelled fallback can
exercise AgniVision.live’s JavaScript product layer, but it does not prove Google Maps SDK
rendering or platform parity. Release mode always requires the configured Google
provider.

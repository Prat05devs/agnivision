# AgniVision

Official website: [agnivision.live](https://agnivision.live)

An Expo mobile application for presenting recent satellite fire-detection information for India. The mobile app is built with React Native, TypeScript, and Zustand.

It deliberately treats a satellite detection as a thermal anomaly observation—not as a verified fire incident, fire perimeter, or safety assessment.

## Stack

- Expo managed workflow / React Native
- TypeScript with strict checking
- Zustand for shared data, UI, and device state
- React Navigation native stack with `react-native-screens` and gesture handling
- `react-native-safe-area-context` for live status-bar, cutout, and system-navigation insets
- `react-native-maps` for the native map surface
- `expo-location` for foreground location and explicitly enabled coarse background proximity updates
- `expo-notifications` with Expo Push Service for Android FCM and iOS APNs delivery
- Redis REST storage for notification registrations, preferences, pacing, and inbox history
- NDMA SACHET Common Alerting Protocol advisories through an independent server-side, ETag-cached pipeline

## Delivered feature ledger

This section is the project’s delivery record. Every completed feature change must update this ledger and, where relevant, the configuration, deployment, verification, and product-integrity sections below. A feature is marked **Implemented** when its code and local verification are complete; external credentials, deployment, native builds, and physical-device QA are tracked separately and are never implied by that status.

| Feature | Status | Delivered behavior |
| --- | --- | --- |
| Product identity | Implemented | The installed app and launcher name are exactly **AgniVision**. The official website remains **agnivision.live**. Internal native target and package identifiers remain stable to avoid a destructive project migration. |
| Brand navigation | Implemented | A reusable logo-and-wordmark component is the Home action in main and flow headers. The redundant Home tab has been removed; Map, Activity, and Settings remain available in the compact tab bar. |
| Official advisories | Implemented; runtime QA pending | Relevant active NDMA SACHET CAP advisories are discovered through the official RSS feed, fetched server-side with mandatory ETag/304 handling, normalized without mixing official severity with FIRMS confidence, cached through Redis when configured, and surfaced on Home, destinations, a dedicated list/detail flow, and a compact map indicator. |
| Launch experience | Implemented | The former custom splash screen has been removed pending the client-approved replacement. |
| FIRMS data service | Implemented | A server-only proxy queries the India envelope, rejects coordinates outside the India boundary during normalization, normalizes supported MODIS/VIIRS observations, protects the FIRMS key, and caches responses. |
| Observation data policy | Implemented | The app retains at most five days or 2,500 newest observations in memory and does not present detections as confirmed incidents. |
| Public area labels | Implemented; deployment configuration pending | Visible observations are reverse-geocoded on demand into labels such as “Near Malsi, Dehradun, Uttarakhand.” Home, Activity, Map selection, details, accessibility text, and share images use the same label. Nearby coordinates share an approximately 5 km locality cell and caches; failed lookups retain the existing nearest-reference label. Labels describe an approximate area around a satellite coordinate, never a confirmed incident address. |
| Home and Activity | Implemented | Home is map-first: an interactive, responsive India map preview shares detections, camera state, and filters with the full Map, followed by recent updates and then tourism context. Activity provides time, observation-type, and confidence filtering with loading, empty, stale, and error states, and can focus the same observation on Map without losing shared filters. |
| Search and destinations | Implemented | Search and destination detail flows work without Maps credentials, including an India-wide curated destination list and five-day/50 km activity summaries. |
| Detection details, attribution, and sharing | Implemented | Normal screens use product-oriented observation language. Original provider metadata remains in the normalized model and appears only in expandable Data Sources & Attribution sections. Users can also create a branded shareable PNG for the native share sheet or photo gallery. |
| Navigation and adaptive layout | Implemented; device matrix pending | Search, destination, details, and notification screens use one native stack. Android hardware/system-edge back and iOS swipe-back pop one screen; only an unstacked Home permits app exit. Android Back dismisses either a map detection or destination before leaving Map. Root-tab changes no longer dispatch an invalid pop action when already on Main. iOS relies on its declared orientation support instead of invoking the simulator-warning-producing runtime orientation setter; Android retains contextual orientation control. Headers, custom tabs, pushed-screen bottoms, and map controls consume live safe-area insets. Scroll content is width-bounded on tablets and destination search adjusts for the keyboard. |
| Thermal Google Map | Implemented in source; native visual QA pending | The full Map and Home preview render a continuous native Google density surface with no regional numeric cluster badges. Every filtered India observation contributes equally, so medium concentrations peak yellow/orange and the densest cores reach red. Neighboring-country points are rejected again at heat-layer construction. Heat-cluster taps still drill down, while sparse individual observations remain tappable at close zoom. Existing search, filters, selection, location, responsive sheets, and camera persistence remain intact. The prior Google base map was verified in iOS Simulator, but this revised heat layer has not been rebuilt or visually claimed. |
| India destination search | Implemented; deployment pending | Google Places autocomplete and details run through a server-only proxy, restrict results to India, retain curated offline destinations, and connect Map searches to a distinct destination marker plus 25 km situation view. |
| Notification preferences | Implemented | A master switch, category controls including official advisories, 5/10/25/50 km radius choices, confidence threshold, quiet hours, High/official severe override, and honest permission state are available under Settings. |
| Destination watches | Implemented | Users can subscribe to chosen destinations without sharing device location; watches default to 25 km and can be edited or removed. |
| Proximity monitoring | Implemented | Opt-in coarse location supports Always, While Using, and Off behavior. Background collection runs only while master notifications and Nearby detections are enabled. |
| Notification matching and pacing | Implemented | Server matching aggregates detections and applies per-detection deduplication, Nominal-to-High escalation, category cooldowns, quiet hours, rolling caps, priority, and a final nearby summary. |
| Regional, digest, and status notifications | Implemented | Regional anomalies require a warmed seven-day baseline; weekly summaries are opt-in; prolonged FIRMS failures can produce a calm status notice. |
| Notification inbox and routing | Implemented | Pushed and inbox-only events are retained in reverse chronological order. Notification taps open loaded details or Activity without requiring Google Maps. |
| Push transport | Built; credentials/device QA pending | Android FCM and iOS APNs integration is included through Expo Push Service in the fresh native builds. Remote delivery still requires an EAS project ID, Android FCM configuration, iOS APNs credentials, deployed notification services, and physical-device QA. Maps credentials are unrelated to notification delivery. |

## Application foundation

- Home, map, recent-activity, and source-information views
- Shareable observation PNG cards with native share-sheet and photo-gallery save actions
- Search, destination-situation, and full detection-detail flows that work before Maps keys are available
- A compact India-wide travel list covering every state, with a fixed five-day/50 km destination activity rule
- A green near-real-time feed card that rotates through the newest loaded observations every ten seconds
- Ten-minute foreground data refresh plus time, sensor, and confidence filters
- An explicit in-memory retention policy: at most five days or 2,500 observations, with no activity history written to phone storage
- Zustand store for detections, time filters, selection, map tab, and foreground location
- Permission-aware location restoration on launch and foreground resume, without repeatedly prompting users who denied access
- A portable Node API service that queries FIRMS, validates `days=1` through `days=5`, normalizes MODIS/VIIRS records, and caches public responses
- A dedicated mobile repository that calls the normalized server endpoint instead of exposing a NASA FIRMS key in the app
- Server-only, India-scoped reverse geocoding for locality/city/state labels, requested only for visible observations and batched up to 12 coordinates
- Clear loading, empty, stale-data, and error states
- An India-centered thermal density map with equal per-observation weighting, no regional count badges, tappable heat-cluster drill-down, close-zoom observation details, shared filters, location, and destination context
- Opt-in development mock mode, disabled in release builds

The app does not fabricate production data while external services are being configured. The underlying Google Maps integration was visually verified in an earlier iOS Simulator build. The continuous heat layer is source-verified only until the next authorized native run. The earlier Android artifact passed build and package-integrity checks; Android runtime and physical-device parity testing remain pending.

## Navigation and device adaptation

The app has exactly one `NavigationContainer` and one native root stack. Main tabs retain their state beneath pushed Search, Destination, Detection Details, Notification Settings, and Notification Inbox screens. Forward actions push routes; header back, Android hardware/system-edge back, and iOS swipe-back pop the same single route. On the custom main tab surface, Android Back first closes an open map selection, then returns a non-Home tab to Home, and exits only from an unstacked Home screen. The manifest keeps `enableOnBackInvokedCallback=false` because the installed React Navigation generation does not support Android’s predictive animation API; the backward-compatible system edge gesture remains functional through the standard back dispatcher.

`SafeAreaProvider` sits at the app root. Custom headers apply the live top/side insets, the custom tab bar applies the live bottom/side insets, and pushed scroll screens account for the Android navigation inset. Map overlays account for left/right cutouts while remaining inside the header/tab-safe content region. Insets update with OS window changes; no status-bar or navigation-bar height is hardcoded.

Destination search uses native keyboard inset adjustment on iOS and the Android activity remains configured with `adjustResize`. General content is capped at a readable width on large screens while preserving full-width behavior on phones. Code/config checks cover this implementation; the notch, punch-hole, gesture navigation, three-button navigation, tablet, rotation, and physical back-gesture matrix remains mandatory on real devices.

## Prerequisites

- Node.js 20.12 or newer; Node.js 24 is the verified native-build runtime
- Xcode for native iOS development or Android Studio for native Android development
- An Expo account only if you later use EAS Build
- Restricted Google Maps keys for a native production map
- A deployed HTTPS data endpoint that normalizes NASA FIRMS data

## Set up

```sh
cp .env.example .env
npm install
npm run dev
```

`npm run dev` starts both the server-side FIRMS proxy and Expo. It automatically gives Expo a LAN URL that a phone on the same Wi-Fi network can reach, while keeping `FIRMS_MAP_KEY` out of the mobile bundle. Then scan the Expo QR code or open the app with an Android emulator/device or iOS simulator/device.

For native map-key changes, create a new native development or release build; an over-the-air reload does not apply native configuration changes.

Useful commands:

```sh
npm run typecheck
npm test
npm run api:dev
npm run android
npm run ios
```

## Verification record

Last updated: 2026-09-06.

- Strict TypeScript check: passed.
- Automated unit tests: 47 passed, including 100-request cache coalescing, failure cooldown, Android detection/destination back-order, thermal intensity/clustering, India-boundary checks, Places proxy coverage, area parsing, locality-cell coalescing, and server-key protection.
- Expo public configuration resolution: passed.
- Android manifest and iOS property-list parsing: passed.
- Navigation audit: one root `NavigationContainer`, one root `SafeAreaProvider`, native screens enabled, no manual overlay-screen swapping, and no unscoped back listener.
- Runtime navigation guard: returning to Main checks `canGoBack()` before dispatching `popToTop`, preventing the development-only unhandled `POP_TO_TOP` warning.
- iOS orientation handling: runtime lock/unlock calls are skipped because supported orientations are already declared in `Info.plist`, avoiding the UIKit `UIDevice.orientation` development warning.
- iOS native verification: a fresh signed simulator app built and launched successfully; Google attribution, the styled basemap, live FIRMS data, and clustered Thermal Signals were visually confirmed. The final observed feed contained 176 detections.
- Android native verification: the current signed AAB built successfully for all configured ABIs with application ID `live.agnivision.app`, launcher label `AgniVision`, version `1.0.0`/code `2`, and target SDK 36. Release lint, signature verification, merged-manifest review, and an exact server-credential scan passed.
- Still pending: Android runtime testing and physical Android/iOS verification across notch, punch-hole, gesture navigation, three-button navigation, tablet, rotation, keyboard, map overlays, and notification-open scenarios.
- Remote push delivery remains pending because `EXPO_PUBLIC_EAS_PROJECT_ID`, Android `google-services.json`/FCM credentials, iOS APNs credentials, and the deployed notification backend are not configured locally. This does not affect Google Maps.

## Native artifact ledger

Earlier APK/ZIP entries below are historical. The first row is the current Android release candidate.

| Artifact | Purpose and validation | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `artifacts/AgniVision-1.0.0-2-release.aab` | Current signed Play release candidate; all four ABIs, release lint, signature, manifest, and credential scan verified. | 57,883,068 | `980a7616b833227d1496c5dfe5a0e0b918f6da6cfbc62af7f64531ebc20562c5` |
| `artifacts/Agnivision-v0.1.0-arm64-google-maps-complete.apk` | Fresh Android arm64 test-release APK with Google Maps and all current app modules; package, ABI, manifest, ZIP, and v2 signature checks passed. | 33,400,769 | `9963bab47011b89413f0a165dcdeaf641bc53bc92f5987901569f8049cf2f06b` |
| `artifacts/Agnivision-v0.1.0-ios-simulator-google-maps.zip` | Fresh signed iOS simulator `.app`; launched successfully with Google Maps and live clusters. Archive and Google Maps SDK resource checks passed. | 25,401,164 | `399fc144b4f363d5318d0a0deb323cf9d0aa8d7afa7713b4657fe7a1304d87ea` |
| `artifacts/Agnivision-v0.1.0-arm64-live-firms.apk` | Earlier preserved Android APK. | 31,496,167 | `4489c7c55e9303b33390e26f2164f576db2b64ef2979e8003a92ba88e11ab240` |
| `artifacts/Agnivision-v0.1.0-arm64-test.apk` | Earlier preserved Android APK. | 31,496,151 | `789edbefd9cc332384d3720c77d3d951253af32c91626163fd9570aa403e50ad` |

## Implementation verification cadence

Feature plans are implemented in batches of four phases. Individual phases receive
only focused checks needed to continue safely; the full TypeScript, automated-test,
configuration, and integrity pass runs after phases 1–4, 5–8, 9–12, and at final
acceptance. Native prebuilds, recompilation, artifact generation, and physical-device
testing remain separate and require explicit authorization.

## Configuration

Copy `.env.example` to `.env` and supply these values:

| Variable | Purpose |
| --- | --- |
| `FIRMS_MAP_KEY` | Server-only NASA FIRMS key. It is consumed by the Vercel function and must never have an `EXPO_PUBLIC_` prefix. |
| `EXPO_PUBLIC_FIRE_DATA_URL` | HTTPS URL of the deployed AgniVision.live data proxy, for example `https://your-project.vercel.app/api/fire-detections`. |
| `EXPO_PUBLIC_ADVISORIES_API_URL` | Optional public URL for `/api/advisories`; otherwise derived from the FIRMS endpoint origin. The mobile app never calls SACHET directly. |
| `EXPO_PUBLIC_NOTIFICATION_API_URL` | Public `/api` root for device registration, inbox, coarse-location updates, and notification dispatch. |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Expo/EAS project UUID used to generate an app-scoped push token. |
| `GOOGLE_SERVICES_JSON` | Local path to the Firebase Android app configuration used for FCM; do not commit the referenced file. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Server-only persistent storage for device registrations, watches, inboxes, deduplication, quiet-hour pacing, and rolling caps. |
| `CRON_SECRET` | Server-only secret protecting the scheduled dispatch endpoint. |
| `EXPO_ACCESS_TOKEN` | Optional server-only token when Expo Push Service enhanced security is enabled. |
| `GOOGLE_MAPS_API_KEY_ANDROID` | Android-restricted Google Maps key used at build time. |
| `GOOGLE_MAPS_API_KEY_IOS` | iOS-restricted Google Maps key used at build time. |
| `GOOGLE_PLACES_API_KEY` | Server-only Places API (New) key used by `api/places.ts`; never expose it with an `EXPO_PUBLIC_` prefix. |
| `GOOGLE_GEOCODING_API_KEY` | Optional dedicated server-only Geocoding API key used for observation-area names. If omitted, `GOOGLE_PLACES_API_KEY` is reused and must also be permitted to call Geocoding API. |
| `EXPO_PUBLIC_PLACES_API_URL` | Optional public URL for the AgniVision.live Places proxy; otherwise derived from the data endpoint origin. |
| `EXPO_PUBLIC_DETECTION_AREA_API_URL` | Optional public URL for `/api/detection-areas`; otherwise derived from the data endpoint origin. |
| `EXPO_PUBLIC_IOS_MAPKIT_PREVIEW` | Development-only iOS preview switch. It defaults to `false` for Google Maps; set it to `true` only when inspecting an older simulator binary. It has no release-mode effect. |
| `EXPO_PUBLIC_USE_MOCK_FIRE_DATA` | Set to `true` only during local development to render isolated preview data. |

Client-side Google Maps keys are expected in a mobile app and must be restricted by Android package/signing certificate or iOS bundle identifier. `FIRMS_MAP_KEY` must never use an `EXPO_PUBLIC_` prefix or appear in app configuration/source. It may live in the gitignored local `.env` for `vercel dev`; add it separately to the Vercel Project Environment Variables for deployed functions.

## Data-service contract

The app sends a request like:

```text
GET {EXPO_PUBLIC_FIRE_DATA_URL}?days=5
```

The endpoint must return normalized, validated JSON. A minimal response is:

```json
{
  "fetchedAtUtc": "2026-09-01T08:35:00.000Z",
  "detections": [
    {
      "id": "unique-observation-id",
      "source": "NASA_FIRMS",
      "sensor": "VIIRS_NOAA20_NRT",
      "latitude": 30.3165,
      "longitude": 78.0322,
      "acquiredAtUtc": "2026-09-01T06:15:00.000Z",
      "satellite": "NOAA-20",
      "instrument": "VIIRS",
      "confidence": { "raw": "n", "class": "nominal" },
      "frpMw": 8.4,
      "fetchedAtUtc": "2026-09-01T08:35:00.000Z"
    }
  ]
}
```

The API proxy in `api/fire-detections.ts` queries FIRMS for the India envelope, applies a point-in-boundary check during normalization, caches, normalizes MODIS/VIIRS records, validates query parameters, and protects the FIRMS map key. The same boundary is enforced again before map rendering. Do not call FIRMS directly from the Expo app.

The ten-second home-card rotation is UI-only. The app refreshes a bounded five-day dataset from the shared endpoint every ten minutes while active, and the endpoint applies a matching cache before calling FIRMS. Home and Activity apply their shorter time filters locally; destination checks always use the five-day dataset. This prevents a request explosion while keeping destination results independent from the currently selected Home filter.

## Deploy the data proxy

1. Import this repository into a Vercel project.
2. Enable Google Geocoding API in the Google Cloud project used for area labels. In **Project Settings → Environment Variables**, add `FIRMS_MAP_KEY`, `GOOGLE_PLACES_API_KEY`, and optionally a separately restricted `GOOGLE_GEOCODING_API_KEY` for Production (and Preview if needed).
3. Deploy. Vercel exposes the data function at `https://your-project.vercel.app/api/fire-detections`, destination proxy at `/api/places`, and observation-area proxy at `/api/detection-areas`.
4. Add that URL to `EXPO_PUBLIC_FIRE_DATA_URL` in local `.env`, then create a fresh Expo build.

For normal local development, use `npm run dev`. To run only the local API, use `npm run api:dev`; it reads the gitignored `.env` and listens on port 8787. The API supports `?days=1` through `?days=5` and sends a short cache header. The API returns available sources even when one FIRMS sensor is temporarily unavailable.

## Notification deployment

Notifications are independent of Google Maps. Destination matching uses saved coordinates, proximity matching uses a coarse device coordinate, and both run against normalized FIRMS detections on the server.

Before remote delivery can work:

1. Create/link an Expo EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID`.
2. Configure Android FCM v1 credentials, provide `google-services.json` through `GOOGLE_SERVICES_JSON`, and configure iOS APNs credentials for that EAS project. Apple delivery requires an Apple Developer account.
3. Provision Upstash Redis and add its REST URL/token plus `CRON_SECRET` to Vercel.
4. Deploy the API and set `EXPO_PUBLIC_NOTIFICATION_API_URL` to its `/api` root.
5. Use a scheduler capable of calling `/api/notification-dispatch` every ten minutes. The included Vercel cron requires a plan that permits this frequency; Vercel Hobby cron is limited to once daily.
6. Create a new native development/release build when ready. Expo Go on Android cannot receive remote push notifications.

See `NOTIFICATION_IMPLEMENTATION.md` for architecture, privacy behavior, and verification details.

## Native build configuration

`app.config.ts` reads optional Android/iOS Google Maps keys and separately configures notification and opt-in background-location capabilities. After changing native configuration, run a fresh native build (for example, `npx expo run:android`, `npx expo run:ios`, or your EAS profile).

Map availability is derived from whether both native platform keys exist during Expo configuration; there is no separate public enable flag. Run native prebuild/build only when authorized so the config plugin can inject those keys. See `MAP_IMPLEMENTATION.md` for rendering, India-scope, performance, and QA decisions.

## Product integrity

- A zero-result response is shown as “No recent satellite detections found”; it never means “there are no fires.”
- Observation and fetch timestamps are distinct.
- Confidence is shown as a source-data class, never as a probability of fire.
- A reverse-geocoded area is labelled approximate and begins with “Near.” It identifies human-readable context around the satellite coordinate, not an ignition point, property, confirmed incident address, or emergency boundary.
- Notification registrations use a per-installation secret stored in the device keychain/secure storage; no user account is required.
- Background location starts only after the user explicitly requests it for Proximity Alerts. Coordinates are rounded before upload and no route history is stored.
- Push copy reports satellite detections or thermal anomalies, never confirmed incidents, danger levels, or evacuation advice.
- Do not commit `.env`, signing credentials, or any server-side credentials.
- Activity is a bounded view of the current FIRMS dataset, not a permanent viewed-item log. Refreshes replace the in-memory dataset; a maximum of five days or 2,500 newest observations is retained.

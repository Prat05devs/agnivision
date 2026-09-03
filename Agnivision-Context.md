---
date: 2026-09-01
developer: Prateek Thapliyal
document: Project Context & Engineering Source of Truth
platforms:
- Android
- iOS
primary_stack:
- Expo
- React Native
- TypeScript
- Zustand
- Google Maps Platform
- NASA FIRMS
project: Agnivision
status: Scope-frozen MVP
target_timeline_days: 20
version: 2
---

# Agnivision --- Project Context

## 1. Purpose of This File

This file is the engineering source of truth for the Agnivision
project.

It is intended to be given to AI coding agents, developers, designers,
testers, and future contributors so that the project can be built
consistently without repeatedly reconstructing the product requirements
from conversations.

The application is a **public forest-fire information and visualization
application** for India, with particular emphasis on Uttarakhand and its
tourism ecosystem.

The product is intentionally **not** a government operations dashboard
in this phase. It is not an officer-management system, not an
incident-management system, and not an AI prediction platform.

The core idea is simple:

> Take reliable satellite fire-detection information that already
> exists, combine it with a high-quality mobile map experience, and make
> the information understandable and useful to ordinary citizens and
> tourists.

The product should feel like a modern international public-information
application, not like a conventional government data portal.

------------------------------------------------------------------------

# 2. Scope Authority

This file is the engineering authority for the public-visualization
MVP. Do not silently inherit broader functionality from earlier
discussions or external documents.

If a request introduces a feature that is listed as out of scope here,
treat it as a scope change and explicitly flag it before implementation.

### Current scope authority

When requirements conflict:

1.  Agreed current product scope
2.  This context file
3.  Compatible technical decisions already made in the repository
4.  Earlier brainstorming/speculation

Earlier conversations contain ideas for AI, forest health analysis,
officer dashboards, ML prediction, Sentinel imagery, fire-spread
forecasting, alerts, and other modules. Those ideas are **future roadmap
material unless explicitly included in the current scope below**.

------------------------------------------------------------------------

# 3. Delivery Priorities

The project is intentionally being delivered on an accelerated schedule.
The first priority is a working product. Visual refinement and polish
follow the core data/map functionality rather than delaying the
fundamental application.

## Required project access

Production release preparation requires:

-   a Google Cloud project with Google Maps API credentials
-   Android developer account access
-   Apple developer account access
-   required signing/developer access

------------------------------------------------------------------------

# 4. Product Vision

Agnivision should answer one question extremely well:

> "What is happening with forest-fire activity around India and around
> the place I care about right now?"

Examples:

-   "Are there recent fire detections in Uttarakhand?"
-   "Is there anything detected near Nainital?"
-   "What about Mussoorie?"
-   "Are there any recent detections near Chopta?"
-   "I am currently in Dehradun --- what is happening nearby?"
-   "Where in India are recent satellite fire detections occurring?"

The product is intended for:

### Citizens

People living in India who want to understand current forest-fire
activity.

### Tourists

People travelling through Uttarakhand or other Indian destinations who
want an easy way to understand whether recent satellite fire detections
are present around their destination.

### Visitors from outside India

The UI should be understandable without requiring knowledge of Indian
government systems or GIS terminology.

### Public-information / awareness use

The application should make reliable public data easier to consume.

------------------------------------------------------------------------

# 5. Product Principles

## 5.1 Truth before visual complexity

Never display information simply because it looks good in a design.

Every displayed field must have a known source.

If the upstream API does not provide a field, do not invent it.

## 5.2 Satellite detection is not automatically a confirmed fire

The application must distinguish between:

-   Satellite detection
-   Thermal anomaly
-   Fire detection reported by the data provider
-   Officially verified incident

The MVP is primarily displaying satellite-derived detections.

Do not label a point as an officially confirmed forest fire unless the
source explicitly provides that status.

## 5.3 Never claim safety

The application must not say:

-   "This place is safe."
-   "This destination is unsafe."
-   "There is no danger."
-   "The route is safe."

Instead, say things such as:

-   "No recent satellite detections found within the selected radius."
-   "Recent satellite detections were detected nearby."
-   "Latest available satellite observation: ..."

The application provides information, not an emergency-safety
certification.

## 5.4 Source transparency

The user should always be able to understand:

-   What source produced the information?
-   Which satellite/sensor produced it?
-   When was the observation made?
-   When did the application last fetch the data?

## 5.5 Minimal user friction

Public users do not need:

-   Login
-   Registration
-   Account creation
-   Password
-   Government ID
-   Profile setup

The public application should open and become useful immediately.

## 5.6 Premium UX without unnecessary functionality

The application should feel sophisticated through:

-   typography
-   spacing
-   map composition
-   information hierarchy
-   animation
-   transitions
-   micro-interactions
-   loading states
-   clear data provenance

It should not become sophisticated by adding unnecessary enterprise
features.

------------------------------------------------------------------------

# 6. Current MVP Scope

The current MVP is a **mobile-only public visualization product**.

## Included

-   Android application
-   iOS application
-   React Native shared codebase
-   Interactive Google Maps map
-   India-wide forest-fire/thermal-anomaly visualization
-   NASA FIRMS integration
-   VIIRS near-real-time data
-   MODIS near-real-time data
-   Fire detection markers
-   Detection information
-   Current user location
-   Approximate distance calculations
-   Place/destination search
-   Tourist destination fire-situation view
-   Recent activity filters
-   Source/data transparency
-   Basic sharing
-   Error/loading/empty states
-   Cross-platform testing
-   Android APK/build delivery
-   iOS build preparation
-   Source-code handover

------------------------------------------------------------------------

# 7. Explicitly Not Included in MVP

The following are not part of the current MVP:

-   Web application
-   Web monitoring dashboard
-   Officer dashboard
-   Forest Department operational dashboard
-   Admin dashboard
-   User authentication
-   Officer authentication
-   Staff management
-   Crew management
-   Resource management
-   Firefighter tracking
-   Incident assignment
-   Incident closure workflow
-   User-generated fire reports
-   Image upload workflow
-   Citizen reporting system
-   AI/ML prediction
-   Fire-spread prediction
-   Fire perimeter prediction
-   Fire severity prediction
-   Forest health analysis
-   Illegal logging detection
-   Encroachment detection
-   Sentinel-1 analysis
-   Sentinel-2 image analysis
-   NDVI analysis
-   NBR/dNBR analysis
-   Burn-area analysis
-   Drone integration
-   Satellite image processing pipeline
-   GIS polygon analytics
-   Custom forest-boundary analytics
-   Route avoidance
-   Navigation
-   Emergency dispatch
-   Government command-and-control system
-   Automated evacuation recommendations
-   Official emergency certification
-   Medical/facial-recognition features
-   Landslide monitoring
-   Flood monitoring
-   Wildlife-conflict monitoring
-   Border monitoring
-   Multi-disaster dashboard
-   Departmental notification-management system
-   ML model training/retraining
-   Custom AI inference infrastructure

------------------------------------------------------------------------

# 8. Important Decision About Notifications

Earlier discussions considered "constant reminders" and fire alerts.

For the current MVP, the safest scope interpretation is:

**The app provides frequently refreshed visual information, not a full
push-notification/alert-management system.**

Do not implement a complex background alert engine unless it is
explicitly added to the scope.

Future versions may add:

-   push notifications
-   location-based fire alerts
-   saved destinations
-   watch areas
-   notification thresholds
-   severe-event alerts
-   government alert integration

These are roadmap features.

------------------------------------------------------------------------

# 9. Public User Flow

## Flow A --- First Launch

``` text
Launch
  ↓
Short branded introduction / loading
  ↓
Home
  ↓
Current forest-fire situation
  ↓
Map / search / recent activity
```

The user should not be forced to create an account.

------------------------------------------------------------------------

# 10. Home Screen

The home screen is the public entry point.

It should provide:

-   Current data freshness
-   High-level recent activity summary
-   Entry point to the India map
-   Search
-   Current-location action
-   Recent activity
-   Tourism-oriented destination discovery
-   Data-source transparency

The home screen should not pretend to have information that the APIs do
not provide.

### Example information

Good:

> "Recent satellite detections across India"

Good:

> "Last data refresh: 14:20 IST"

Good:

> "VIIRS + MODIS"

Avoid:

> "India currently has 327 active forest fires"

unless that number has actually been computed from the current source
data and its definition is clearly stated.

Avoid:

> "327 fires are burning right now"

because satellite detections are not equivalent to confirmed active
incidents.

### Rotating observation feed

The primary green home card should rotate through the newest loaded
satellite detections approximately every five seconds. Each rotation may
show the derived approximate region, coordinates, observation time,
sensor, and confidence class.

This is a presentation rotation, not a new FIRMS request every five
seconds. It must be labelled as a near-real-time observation feed and
must not call detections confirmed incidents or notifications.

------------------------------------------------------------------------

# 11. Map Flow

``` text
Home
  ↓
Open Map
  ↓
India map
  ↓
Load recent detections
  ↓
Render markers/clusters
  ↓
Tap marker
  ↓
Detection bottom sheet
  ↓
Open detailed detection view
```

## Initial map

The default camera should show India.

The map should be visually clean.

Avoid immediately rendering hundreds or thousands of individual
overlapping markers.

Use clustering/aggregation where appropriate.

------------------------------------------------------------------------

# 12. Map Interaction

The user can:

-   zoom
-   pan
-   tap detections
-   return to current location
-   search a location
-   select a time filter
-   change data-source filter if implemented
-   open detection details

The map is the central visual component of the product.

------------------------------------------------------------------------

# 13. Marker Strategy

The map will use point-based detections.

No custom fire polygons are required for the MVP.

Each detection contains a latitude and longitude.

Marker rendering should support:

-   individual fire markers
-   cluster markers
-   selected marker state
-   loading state
-   stale-data state where applicable

The visual language should communicate "detection" rather than literally
depicting a burning forest.

------------------------------------------------------------------------

# 14. Detection Detail Flow

``` text
Map
  ↓
Tap detection
  ↓
Bottom sheet
  ↓
User expands
  ↓
Detection details
```

The detail view can display, where provided:

-   Detection location
-   Latitude
-   Longitude
-   Detection date
-   Detection time
-   Satellite
-   Instrument
-   Confidence
-   Brightness temperature
-   Fire Radiative Power
-   Day/night
-   Source
-   Latest application refresh

The UI must hide fields that are unavailable for a particular source
rather than displaying fake placeholders.

------------------------------------------------------------------------

# 15. Current Location Flow

``` text
User taps "Use my location"
  ↓
Request location permission
  ↓
Permission granted?
  ├── Yes → Get device coordinates
  │          ↓
  │        Center map
  │          ↓
  │        Find nearby detections
  │
  └── No → Continue without location
```

Location is a device capability.

The application does not need a separate location API merely to
determine the user's own coordinates.

The user can use the map without granting location permission.

The application should request only "when in use" location access.

Do not implement continuous background location tracking.

------------------------------------------------------------------------

# 16. Distance Calculation

For MVP, distance should be calculated locally using latitude/longitude.

Use the Haversine formula or a standard geospatial distance utility.

Do not introduce:

-   Google Routes API
-   Distance Matrix
-   Navigation SDK
-   route optimization

unless a future scope explicitly requires them.

The user needs an approximate distance to a detection, not turn-by-turn
navigation.

Example:

> "Approx. 38 km from selected destination"

Avoid implying road distance if the calculation is straight-line
distance.

Use wording such as:

> "Approx. straight-line distance"

or simply:

> "Approx. distance"

if the UI explains the methodology.

------------------------------------------------------------------------

# 17. Search Flow

## User searches for a destination

``` text
Home / Map
  ↓
Search
  ↓
User enters "Nainital"
  ↓
Places Autocomplete
  ↓
User selects destination
  ↓
Place coordinates returned
  ↓
Map centers on destination
  ↓
Nearby fire detections identified
  ↓
Destination Situation card
```

The search is primarily for geographic place selection.

It is not a generic web search.

------------------------------------------------------------------------

# 18. Tourist Destination Flow

Example:

``` text
Search: Chopta
  ↓
Select Chopta
  ↓
Map centers on Chopta
  ↓
Nearby detections calculated
  ↓
Destination situation displayed
```

Possible UI:

``` text
CHOPTA
Uttarakhand

Recent satellite activity
2 detections nearby

Nearest detection
Approx. 18 km

Latest observation
Today, 13:42 UTC

Sources
VIIRS
MODIS

Data status
Updated recently
```

Do not produce an "official safety score."

Do not say "safe for tourists."

The app is an information layer.

------------------------------------------------------------------------

# 19. Recent Activity Flow

``` text
Home
  ↓
Recent Activity
  ↓
List of recent detections
  ↓
Sort/filter
  ↓
Tap item
  ↓
Detection detail
```

Possible filters:

-   Latest
-   Last 24 hours
-   Last 3 days
-   Sensor
-   Confidence

Only expose filters that can be supported reliably by the actual data.

------------------------------------------------------------------------

# 20. Data Source Screen

The application should include a simple explanation of the data.

Example:

### NASA FIRMS

"Forest-fire and thermal-anomaly information is sourced from NASA's Fire
Information for Resource Management System."

### Satellite data

"Detections may be derived from MODIS and VIIRS near-real-time
products."

### Important note

"Satellite detections indicate thermal anomalies detected by remote
sensing. They are not necessarily confirmed ground incidents."

This screen is important for public trust.

------------------------------------------------------------------------

# 21. Data Model

The application should normalize external data into one internal model.

Recommended conceptual model:

``` ts
type FireDetection = {
  id: string;

  source: "NASA_FIRMS";

  sensor:
    | "MODIS_NRT"
    | "VIIRS_NOAA20_NRT"
    | "VIIRS_NOAA21_NRT";

  latitude: number;
  longitude: number;

  acquiredAtUtc: string;

  satellite: string;
  instrument: string;

  confidence:
    | {
        raw: string | number;
        class?: "low" | "nominal" | "high";
      }
    | null;

  brightnessKelvin?: number;
  secondaryBrightnessKelvin?: number;

  scanKm?: number;
  trackKm?: number;

  frpMw?: number;

  dayNight?: "D" | "N";

  version?: string;

  sourceRaw?: Record<string, unknown>;

  fetchedAtUtc: string;
};
```

This model is deliberately designed to accommodate different fields from
MODIS and VIIRS without pretending they are identical products.

------------------------------------------------------------------------

# 22. NASA FIRMS --- Primary Fire Data Source

## Provider

NASA LANCE / FIRMS.

FIRMS stands for:

**Fire Information for Resource Management System**

This is the primary fire-detection source for the MVP.

NASA provides a free FIRMS MAP_KEY for API access.

The Area API accepts:

-   MAP_KEY
-   source
-   geographic area/bounding box
-   day range
-   optional date

The Area API supports sources including:

-   MODIS_NRT
-   VIIRS_NOAA20_NRT
-   VIIRS_NOAA21_NRT
-   VIIRS_SNPP_NRT
-   standard products

For this project, the primary MVP sensors are:

-   MODIS_NRT
-   VIIRS_NOAA20_NRT
-   VIIRS_NOAA21_NRT

Suomi-NPP/VIIRS may be considered later if required, but is not a
dependency of the MVP.

------------------------------------------------------------------------

# 23. FIRMS API Request Strategy

Do not query the entire world.

The NASA documentation notes that a worldwide VIIRS query can return
tens of thousands of records per day.

For this application:

### Preferred strategy

Use an India bounding box for the main map and/or a viewport-aware
bounding box where appropriate.

Conceptual endpoint:

``` text
firms.modaps.eosdis.nasa.gov/api/area/csv/
{MAP_KEY}/{SOURCE}/{AREA_COORDINATES}/{DAY_RANGE}
```

Example source identifiers:

``` text
MODIS_NRT
VIIRS_NOAA20_NRT
VIIRS_NOAA21_NRT
```

Use a small day range for the live/recent view.

Do not fetch months of data for the mobile MVP.

------------------------------------------------------------------------

# 24. FIRMS Data Fields

## VIIRS

FIRMS VIIRS NRT records can contain:

-   latitude
-   longitude
-   bright_ti4
-   scan
-   track
-   acq_date
-   acq_time
-   satellite
-   instrument
-   confidence
-   version
-   bright_ti5
-   frp
-   daynight

The VIIRS product represents high-resolution active-fire observations.
The confidence field is categorical rather than a statistical
probability.

Typical confidence classes are:

-   low
-   nominal
-   high

## MODIS

FIRMS MODIS NRT records can contain:

-   latitude
-   longitude
-   brightness
-   scan
-   track
-   acq_date
-   acq_time
-   satellite
-   instrument
-   confidence
-   version
-   bright_t31
-   frp
-   daynight

MODIS confidence is represented numerically and can be interpreted into
the NASA-defined confidence classes when required.

Do not visually compare MODIS numeric confidence and VIIRS categorical
confidence as if they were the same measurement.

------------------------------------------------------------------------

# 25. Confidence Presentation

Confidence is a data-quality indicator.

It is not a statistical probability that "there is a fire."

The UI should use labels such as:

-   High confidence
-   Nominal confidence
-   Low confidence

where the source provides the corresponding classification.

Do not display:

> "87% chance of fire"

unless a completely separate model actually computes that probability.

The current product does not have such a model.

------------------------------------------------------------------------

# 26. Fire Radiative Power

FRP may be available from FIRMS.

FRP is related to the rate of radiative energy emitted by active fires
and is commonly used as an indicator/proxy of fire intensity.

The UI may display:

> FRP: 12.4 MW

where available.

Do not convert FRP directly into:

-   burned hectares
-   fire size
-   severity
-   danger score

without an explicit scientific methodology.

------------------------------------------------------------------------

# 27. Data Freshness

The app must distinguish:

1.  Observation time
2.  API fetch time
3.  UI refresh time

These are not the same.

Example:

``` text
Observed: 13:42 UTC
Data fetched: 14:05 UTC
```

The UI can display:

> "Observation: 13:42 UTC"

and separately:

> "Data refreshed: 14:05 UTC"

This is much more trustworthy than simply writing "Live."

------------------------------------------------------------------------

# 28. "Live" Language

Avoid making absolute claims about real-time data.

Preferred:

-   "Near real-time satellite detections"
-   "Latest available detections"
-   "Recently observed"
-   "Last available satellite observation"

Avoid:

-   "Every fire in India right now"
-   "100% live"
-   "All active fires"
-   "Official fire status"

unless the underlying source and methodology actually justify those
claims.

------------------------------------------------------------------------

# 29. Data Refresh Strategy

A public mobile application should not make every phone directly query
FIRMS repeatedly.

A better architecture is:

``` text
Mobile Apps
     ↓
Agnivision data endpoint
     ↓
Short cache
     ↓
NASA FIRMS
```

This provides:

-   API-key protection
-   reduced FIRMS requests
-   consistent data for users
-   simpler client code
-   better error handling
-   easier future source integration

A lightweight serverless function is sufficient for the MVP.

It does not need to become a large backend platform.

The mobile application may refresh the shared endpoint approximately
every two minutes while active. The endpoint remains protected by its
server/CDN cache. The five-second home-card rotation uses the already
loaded dataset and does not poll FIRMS.

------------------------------------------------------------------------

# 30. Recommended Lightweight Backend

A minimal server-side data layer can be implemented using a serverless
platform such as Vercel Functions.

Conceptually:

``` text
GET /api/fire-detections
```

The function:

1.  validates query parameters
2.  determines the requested area/time window
3.  checks cache
4.  requests FIRMS if cache is stale
5.  normalizes MODIS/VIIRS data
6.  returns normalized JSON
7.  sets a short cache lifetime

No user authentication is required.

No user database is required.

No admin database is required.

No persistent incident-management database is required for MVP.

------------------------------------------------------------------------

# 31. Cache Strategy

Because all public users can consume the same fire data, cache
aggressively enough to protect upstream APIs.

Recommended starting point:

-   2--5 minute server-side cache for recent data
-   short client-side cache
-   stale data may be shown with an explicit timestamp when upstream
    service is temporarily unavailable

The exact cache interval can be adjusted after observing API behavior.

Do not describe cached information as freshly live.

------------------------------------------------------------------------

# 32. FIRMS Key Security

The FIRMS MAP_KEY should not be hard-coded into the React Native
application if a server-side proxy is used.

Store it in server-side environment variables.

Example conceptual variable:

``` text
FIRMS_MAP_KEY
```

Do not commit it to Git.

Do not put it in public documentation.

Do not paste it into source code.

Do not expose it through logs.

------------------------------------------------------------------------

# 33. Google Maps Platform

Google Maps is the primary visualization layer.

Use it for:

-   India map
-   markers
-   map camera
-   zoom/pan
-   user-location visualization
-   selected location
-   map styling

React Native can use `react-native-maps` with Google as the provider on
Android and iOS.

The map layer is a native mobile map component, not a manually drawn GIS
canvas.

------------------------------------------------------------------------

# 34. Google Maps APIs / SDKs

## Core

### Maps SDK for Android

Required for the Android Google Maps experience.

### Maps SDK for iOS

Required if Google Maps is used consistently on iOS.

### Places API / Places SDK

Used for place search and destination selection.

### Geocoding API

Use only when required for address-to-coordinate or
coordinate-to-address functionality.

It should not be used unnecessarily.

------------------------------------------------------------------------

# 35. Google Places Search

Preferred conceptual flow:

``` text
Autocomplete (New)
       ↓
User selects place
       ↓
Place ID
       ↓
Place Details (New)
       ↓
Coordinates
       ↓
Map center
```

Request only fields actually needed.

For this app, likely fields are:

-   id
-   displayName
-   location
-   formattedAddress
-   types / primaryType when useful

Do not request:

-   reviews
-   photos
-   phone numbers
-   ratings
-   opening hours
-   website
-   unnecessary business data

unless a future feature explicitly needs them.

This reduces response size and unnecessary requests.

------------------------------------------------------------------------

# 36. Google Places Request Discipline

The implementation must:

-   use restricted API keys
-   request only required APIs
-   request only required Places fields
-   avoid wildcard field masks in production
-   avoid unnecessary repeated searches
-   debounce autocomplete input
-   use session tokens for Autocomplete sessions where applicable
-   set reasonable quotas

The product should not introduce additional Google APIs simply because
they are available.

------------------------------------------------------------------------

# 37. APIs We Do NOT Need

For the current MVP, do not add:

-   Routes API
-   Navigation SDK
-   Roads API
-   Distance Matrix
-   Street View
-   Maps Datasets API
-   Google Earth Engine
-   Copernicus APIs
-   Sentinel APIs
-   additional geospatial APIs
-   additional fire-data APIs

unless a future scope explicitly requires them.

------------------------------------------------------------------------

# 38. Government Data Sources --- Optional Extension Points

The architecture may later support Indian government/public data
sources.

Potential sources discussed for future integration include:

### Forest Survey of India

Potential:

-   forest-fire WMS/WFS
-   forest-fire monitoring layers
-   fire-danger information
-   large-fire information

### India Meteorological Department

Potential:

-   weather
-   temperature
-   humidity
-   wind
-   rainfall
-   district warnings
-   nowcast

### NDMA SACHET

Potential:

-   official disaster warning information
-   CAP/RSS alerts

### ISRO / NRSC Bhuvan

Potential:

-   place search
-   government geospatial layers

Important:

These are **extension points**, not hard dependencies for the current
MVP.

If an API requires special credentials, whitelisting, departmental
access, or is technically unavailable during the
development window, the core application must still work using NASA
FIRMS.

------------------------------------------------------------------------

# 39. Data Source Priority

For the current fire visualization:

``` text
Primary:
NASA FIRMS
   ├── VIIRS NOAA-20 NRT
   ├── VIIRS NOAA-21 NRT
   └── MODIS NRT

Future/optional:
FSI
IMD
NDMA SACHET
ISRO/NRSC Bhuvan
```

The product should not claim that all sources are simultaneously
authoritative.

If multiple sources detect the same area, the UI can show the individual
detections or a grouped view.

Do not automatically merge separate satellite detections into one "fire
incident" unless a clearly defined clustering algorithm is implemented
and tested.

------------------------------------------------------------------------

# 40. Duplicate/Overlapping Detection Handling

MODIS and VIIRS may detect the same physical event.

For MVP:

-   keep the raw source detections
-   allow multiple markers to be clustered visually
-   show the source sensor in details

Do not create a complicated incident-merging engine.

Future versions can implement:

-   spatial clustering
-   temporal clustering
-   source fusion
-   incident identity
-   confidence fusion

These are not required for the first release.

------------------------------------------------------------------------

# 41. Time Handling

All upstream timestamps should be normalized to UTC internally.

The UI can convert them to:

-   IST for Indian users
-   device-local time where appropriate

Store internally:

``` text
acquiredAtUtc
fetchedAtUtc
```

Never rely on ambiguous date/time strings.

FIRMS acquisition times are based on UTC/GMT.

------------------------------------------------------------------------

# 42. Map Performance

Potentially thousands of points may exist.

Do not render an enormous number of individual complex React components
simultaneously.

Use:

-   clustering
-   lightweight marker rendering
-   memoization
-   viewport filtering
-   server-side geographic filtering
-   limited historical windows

Avoid heavy custom SVG animations for every point.

The map must remain usable on mid-range Android devices.

------------------------------------------------------------------------

# 43. Map Styling

The map should have a restrained visual style.

Potential design direction:

-   clean neutral base map
-   subtle terrain
-   minimal POI clutter
-   clear fire markers
-   high contrast selected marker
-   translucent bottom sheets
-   strong typography
-   restrained accent color
-   no excessive gradients
-   no visual overload

The map should remain useful first and beautiful second.

------------------------------------------------------------------------

# 44. Fire Marker Design

Marker states should communicate:

-   detection
-   selection
-   cluster
-   confidence where appropriate

Avoid a marker design that implies the exact size of the fire.

A satellite hotspot is not a polygon showing the actual fire perimeter.

------------------------------------------------------------------------

# 45. Loading States

Every network-dependent screen needs a deliberate loading state.

Examples:

### Map

Show:

-   map immediately
-   lightweight loading indicator
-   detections appear when available

Do not block the entire application behind a full-screen spinner.

### Search

Show:

-   search activity indicator
-   autocomplete results
-   empty result state

### Destination

Show:

-   destination selected
-   loading nearby detections
-   then situation result

------------------------------------------------------------------------

# 46. Empty States

Examples:

### No detections

> "No recent satellite detections found in this area."

Do not say:

> "There are no fires."

### API unavailable

> "Latest satellite data is temporarily unavailable. Showing the last
> available update."

### No search result

> "We couldn't find that location. Try searching for a city, town or
> destination."

------------------------------------------------------------------------

# 47. Error Handling

The application must gracefully handle:

-   FIRMS timeout
-   FIRMS rate limit
-   invalid MAP_KEY
-   malformed upstream data
-   Google API errors
-   location permission denial
-   no internet
-   partial data
-   empty response
-   server errors

The app should never crash because one external source is unavailable.

------------------------------------------------------------------------

# 48. Offline / Poor Connectivity

The MVP does not need a full offline GIS mode.

However, the app should handle weak connectivity gracefully.

Recommended:

-   keep the map functional
-   retain last successful fire data in short-term local cache
-   show the timestamp of the cached data
-   do not imply that cached information is current

------------------------------------------------------------------------

# 49. Authentication

## Public users

No authentication.

No login.

No registration.

No account.

## Officers/admins

Authentication is a future extension.

There is no officer/admin dashboard in the current scope.

The codebase should avoid creating unnecessary authentication
infrastructure now.

If future authentication is added, it should be introduced as a separate
module.

------------------------------------------------------------------------

# 50. Privacy

The MVP should collect as little user information as possible.

Location should be:

-   requested only when needed
-   used to center the map and calculate proximity
-   not uploaded to a server unless a future feature explicitly requires
    it

No user account is required.

No user profile is required.

No personal data should be stored.

------------------------------------------------------------------------

# 51. No User-Generated Fire Reports

The application does not currently allow users to:

-   upload photographs
-   report fires
-   submit incidents
-   upload videos
-   submit evidence
-   comment on detections

This was discussed as a broader product idea but is not part of this
MVP.

------------------------------------------------------------------------

# 52. Tourism Feature Philosophy

Tourism is an important product differentiator.

Uttarakhand is a major tourism destination and visitors may want quick
situational information before or during travel.

The application should therefore make the fire map useful to tourists
without becoming a tourism booking application.

Tourism features are limited to:

-   destination search
-   destination-centered map
-   nearby fire detections
-   approximate distance
-   latest observation
-   source transparency

Do not add:

-   hotel booking
-   ticketing
-   itinerary generation
-   restaurant search
-   travel navigation
-   tourism recommendations

unless separately scoped.

------------------------------------------------------------------------

# 53. Basic Sharing

Use the native Android/iOS share sheet.

Possible shared content:

``` text
Agnivision

Recent satellite fire detection near:
Nainital, Uttarakhand

Approx. distance:
XX km

Observation:
DATE / TIME

Source:
NASA FIRMS / VIIRS

Satellite data may require official verification.
```

The app should not generate misleading "danger alerts" through sharing.

------------------------------------------------------------------------

# 54. Suggested Navigation

A simple structure is preferred.

Potential bottom navigation:

``` text
Home
Map
Explore
Info
```

or:

``` text
Home
Map
Activity
Info
```

Search can be available globally from Home/Map.

Do not create many nested navigation levels.

------------------------------------------------------------------------

# 55. Recommended Screen Inventory

## Screen 01 --- Splash

Purpose:

-   branding
-   initial app boot
-   configuration/data initialization

## Screen 02 --- Home

Purpose:

-   current situation
-   map entry
-   recent activity
-   search
-   tourism entry

## Screen 03 --- Fire Map

Purpose:

-   India-wide visualization
-   detections
-   clusters
-   location

## Screen 04 --- Search

Purpose:

-   destination/city search

## Screen 05 --- Destination Situation

Purpose:

-   selected destination
-   nearby detections
-   latest update
-   source

## Screen 06 --- Detection Details

Purpose:

-   detailed satellite observation

## Screen 07 --- Recent Activity

Purpose:

-   list/filter recent detections

## Screen 08 --- Data Sources

Purpose:

-   explain where data comes from
-   explain satellite detection limitations

## Screen 09 --- About

Purpose:

-   application information
-   attribution
-   disclaimer
-   version

Some of these should be implemented as bottom sheets/overlays instead of
separate screens if that creates a better UX.

------------------------------------------------------------------------

# 56. Engineering Architecture

Recommended high-level architecture:

``` text
                 ┌─────────────────────────┐
                 │     NASA FIRMS          │
                 │ MODIS / VIIRS NRT       │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Minimal Data Service    │
                 │ serverless/API proxy    │
                 │ validation + normalize  │
                 │ short-term cache       │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ React Native App        │
                 │ TypeScript              │
                 ├─────────────────────────┤
                 │ Map                     │
                 │ Search                  │
                 │ Detection UI            │
                 │ Location                │
                 │ Tourism context         │
                 └────────────┬────────────┘
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
        Google Maps SDK              Google Places
        Android + iOS                / Geocoding
```

------------------------------------------------------------------------

# 57. Expo React Native Stack

Recommended:

-   Expo managed workflow
-   React Native
-   TypeScript
-   Zustand for shared application state
-   react-native-maps
-   Expo Location for foreground device location
-   Expo Sharing/native share capability

Avoid introducing a large number of libraries unless necessary.

The current project is time constrained.

Every dependency should have a clear reason.

------------------------------------------------------------------------

# 58. Map Library

`react-native-maps` is the preferred map abstraction.

Use:

``` text
provider = Google
```

where Google Maps is required on both platforms.

The library supports:

-   MapView
-   Marker
-   Callout
-   Circle
-   Polyline
-   Polygon
-   clustering-compatible patterns
-   map camera control
-   Google map styling

The MVP primarily needs:

-   MapView
-   Marker
-   clustering
-   camera control

Polylines and polygons are not needed.

------------------------------------------------------------------------

# 59. State Management

Do not over-engineer global state.

Separate state into:

### Server/data state

-   fire detections
-   fetch status
-   timestamps
-   source status

### UI state

-   selected marker
-   map region
-   selected filter
-   bottom sheet state
-   search state

### Device state

-   location permission
-   current location

Use Zustand stores and selectors to keep these concerns predictable, so
AI coding agents do not duplicate API calls throughout the UI.

------------------------------------------------------------------------

# 60. API Layer

Create a dedicated API/data layer.

Do not call FIRMS directly from random components.

Conceptual structure:

``` text
src/
  api/
    firms.ts
    places.ts
    fireService.ts

  models/
    fireDetection.ts
    destination.ts

  screens/
    HomeScreen.tsx
    MapScreen.tsx
    SearchScreen.tsx
    DestinationScreen.tsx
    DetectionDetailsScreen.tsx
    ActivityScreen.tsx
    SourcesScreen.tsx

  components/
    FireMarker.tsx
    FireCluster.tsx
    DetectionSheet.tsx
    DestinationCard.tsx
    DataFreshness.tsx

  hooks/
    useFireDetections.ts
    useCurrentLocation.ts
    usePlaceSearch.ts

  utils/
    distance.ts
    time.ts
    confidence.ts
```

The exact folder structure can change if the existing repository already
has a good architecture.

------------------------------------------------------------------------

# 61. Do Not Overwrite Existing Architecture

If this context file is added to an existing repository:

1.  inspect the repository first
2.  identify current stack
3.  identify package manager
4.  identify build setup
5.  identify navigation
6.  identify native configuration
7.  reuse existing conventions where they are sound

Do not rewrite the entire project simply to match this document.

This context defines product behavior, not a mandate to destroy an
existing codebase.

------------------------------------------------------------------------

# 62. Environment Variables

Conceptual variables:

``` text
FIRMS_MAP_KEY=
GOOGLE_MAPS_API_KEY_ANDROID=
GOOGLE_MAPS_API_KEY_IOS=
GOOGLE_PLACES_API_KEY=
```

Actual naming can differ.

Never commit real secrets.

Use separate development/production credentials where possible.

Restrict Google API keys by application/platform and enabled API.

------------------------------------------------------------------------

# 63. Google API Key Separation

Where practical:

### Android key

Restrict by:

-   Android application/package
-   SHA-1/SHA-256 signing certificate as required

### iOS key

Restrict by:

-   iOS bundle identifier

### Server key

If a server-side Places/Geocoding call is used:

-   restrict by server/application usage
-   keep secret
-   never ship it inside the app

The exact Google Cloud setup must be documented in the repository.

------------------------------------------------------------------------

# 64. FIRMS Server Key

The FIRMS MAP_KEY is not a Google client-side key.

If using a server proxy, keep it server-side.

The mobile app should call:

``` text
/api/fire-detections
```

rather than:

``` text
FIRMS directly
```

This protects the key and reduces upstream request volume.

------------------------------------------------------------------------

# 65. Data Normalization Rules

The normalization layer must preserve source truth.

Do not silently rename values in a way that changes their meaning.

Example:

``` text
source confidence "h"
→ confidence.class = "high"
→ confidence.raw = "h"
```

Keep the raw value.

Example:

``` text
MODIS confidence 83
→ confidence.raw = 83
→ confidence.class = "high"
```

The derived class must be clearly marked as derived.

------------------------------------------------------------------------

# 66. Source Metadata

Every normalized detection should retain:

``` text
source
sensor
instrument
version
observation timestamp
fetch timestamp
```

This makes debugging and future source expansion much easier.

------------------------------------------------------------------------

# 67. API Failure Strategy

If FIRMS fails:

``` text
Request
  ↓
FIRMS unavailable
  ↓
Use recent cached data if available
  ↓
Show "Last available update"
  ↓
Do not claim current/live
```

If no cached data exists:

``` text
No data available
```

Do not use fake detections in the production app.

Mock data may be used only in development/testing.

------------------------------------------------------------------------

# 68. Development Mock Mode

A mock mode can exist for UI development.

Example:

``` text
USE_MOCK_FIRE_DATA=true
```

Mock data must:

-   be clearly isolated
-   never be enabled in production builds
-   use a visually obvious development configuration
-   match the normalized `FireDetection` model

Do not accidentally ship demo coordinates to production.

------------------------------------------------------------------------

# 69. Testing Requirements

## Unit tests

Test:

-   FIRMS normalization
-   date/time conversion
-   confidence conversion
-   distance calculation
-   filtering
-   sorting
-   cache freshness

## Integration tests

Test:

-   FIRMS endpoint
-   server proxy
-   Google Places search
-   map initialization

## Device tests

At minimum:

-   Android physical device
-   Android emulator
-   iPhone simulator
-   iPhone physical device if available

Test:

-   map
-   location permission
-   search
-   markers
-   detection details
-   orientation/size
-   network failure

------------------------------------------------------------------------

# 70. Acceptance Criteria

The MVP is considered functionally complete when:

### Application

-   Android app launches successfully.
-   iOS app builds and runs successfully.
-   No authentication is required.

### Map

-   India map loads.
-   Fire detections appear.
-   Markers can be selected.
-   Map can zoom and pan.
-   Current location can be shown after permission.

### Fire data

-   FIRMS data can be fetched.
-   VIIRS data can be displayed.
-   MODIS data can be displayed.
-   Detection timestamps are shown correctly.
-   Source information is visible.
-   No fabricated fields are shown.

### Search

-   User can search for a destination.
-   User can select a place.
-   Map centers on the selected location.
-   Nearby detections can be identified.

### Tourism

-   A destination can show nearby recent satellite detections.
-   Approximate distance is displayed.
-   No unsupported safety claim is made.

### Reliability

-   API failures do not crash the app.
-   Empty states work.
-   Loading states work.
-   Permission denial works.
-   Cached/stale data is clearly identified.

### Delivery

-   Android APK/build provided.
-   iOS build prepared.
-   Source code provided.
-   Project configuration provided.

------------------------------------------------------------------------

# 71. What "Complete" Means

Complete means:

> The agreed public mobile application is implemented, tested to a
> reasonable MVP standard, and produces functional Android/iOS builds
> using the agreed external data sources.

Complete does **not** mean:

-   enterprise-scale government infrastructure
-   guaranteed upstream API uptime
-   guaranteed official government data access
-   24/7 operational support
-   nationwide emergency response
-   AI prediction
-   perfect detection accuracy
-   official incident verification
-   a web dashboard
-   an officer control system

------------------------------------------------------------------------

# 72. Accuracy and Trust Requirements

The most important technical risk is misleading data.

The application should prioritize:

1.  correct coordinates
2.  correct timestamps
3.  correct source
4.  correct confidence interpretation
5.  correct units
6.  correct data freshness
7.  transparent limitations

Do not manipulate source data to make the application appear more
accurate.

------------------------------------------------------------------------

# 73. Important Scientific Limitation

Satellite fire products detect thermal anomalies/fire pixels.

They do not directly provide:

-   exact fire boundary
-   exact burned area
-   exact number of hectares burning
-   ground-confirmed incident status
-   evacuation risk
-   road accessibility
-   human safety

Therefore the MVP is a **visualization and awareness product**, not a
fire-command system.

------------------------------------------------------------------------

# 74. Future Production Roadmap

The architecture should allow future expansion without requiring a full
rewrite.

## Phase 2 --- Government Data Fusion

Potential:

-   FSI layers
-   IMD weather
-   NDMA alerts
-   Bhuvan/ISRO layers

## Phase 3 --- Advanced Tourism

Potential:

-   saved destinations
-   location watchlists
-   destination alerts
-   travel context
-   historical fire activity

## Phase 4 --- Government/Officer Layer

Potential:

-   authentication
-   role-based access
-   officer dashboard
-   division/range/beat hierarchy
-   field verification
-   incident status
-   reporting

## Phase 5 --- Geospatial Intelligence

Potential:

-   Sentinel-2
-   Sentinel-1
-   NDVI
-   NBR/dNBR
-   burned-area mapping
-   forest-change detection
-   regeneration monitoring

## Phase 6 --- AI/ML

Potential:

-   fire-spread forecasting
-   risk scoring
-   false-positive reduction
-   driver classification
-   fire clustering
-   anomaly prediction

The MVP must not pretend to already have these capabilities.

------------------------------------------------------------------------

# 75. Future Government Architecture

A future production system could become:

``` text
NASA FIRMS
FSI
IMD
NDMA
ISRO/Bhuvan
Sentinel
Historical data
Field reports
       ↓
Data ingestion
       ↓
Normalization
       ↓
Geospatial database
       ↓
Analytics / ML
       ↓
Risk engine
       ↓
Government dashboard
       ↓
Officer mobile app
       ↓
Public Agnivision
```

This is the long-term vision.

The current product is only the public visualization layer.

------------------------------------------------------------------------

# 76. Future Data Model Extensibility

Do not name the internal object simply `Fire`.

Prefer:

``` text
FireDetection
```

because future sources may produce:

-   thermal anomaly
-   satellite observation
-   official incident
-   field-confirmed incident

Eventually the domain can become:

``` text
Observation
Incident
Verification
Alert
Location
Source
```

This allows the system to evolve without corrupting the meaning of the
current data model.

------------------------------------------------------------------------

# 77. Future Incident Model

Not required now, but keep in mind:

``` text
SatelliteDetection
      ↓
Possible Incident
      ↓
Official Verification
      ↓
Active Incident
      ↓
Resolved Incident
```

Do not implement this workflow now.

------------------------------------------------------------------------

# 78. Future Alert Model

Not required now, but future alerts could be:

``` text
User
  ↓
Saved location
  ↓
Geofence
  ↓
New detection
  ↓
Threshold
  ↓
Push notification
```

Again, this is future scope.

------------------------------------------------------------------------

# 79. Design Direction

The visual design should aim for international public-data product
quality.

Reference qualities:

-   modern mapping products
-   premium travel applications
-   modern environmental dashboards
-   polished consumer mobile applications
-   scientific visualization products

The app should not look like:

-   an old government portal
-   a generic CRUD dashboard
-   a spreadsheet on a map
-   an engineering prototype

------------------------------------------------------------------------

# 80. Design System Principles

Use:

-   consistent spacing scale
-   semantic typography
-   accessible contrast
-   consistent corner radii
-   consistent elevation
-   restrained shadows
-   purposeful animation
-   clear hierarchy
-   responsive layouts

Avoid:

-   excessive cards
-   excessive gradients
-   giant dashboards
-   excessive icons
-   dense tables
-   tiny text
-   unexplained numbers

------------------------------------------------------------------------

# 81. Micro-interactions

Useful micro-interactions include:

-   marker selection animation
-   bottom-sheet expansion
-   map camera movement
-   search transition
-   destination focus animation
-   loading shimmer
-   subtle refresh indicator
-   cluster expansion
-   selected-location pulse

Animations must not interfere with map performance.

------------------------------------------------------------------------

# 82. Accessibility

The MVP should support:

-   readable font sizes
-   high contrast
-   meaningful labels
-   touch targets of reasonable size
-   screen-reader-friendly important controls
-   color not being the only indicator of confidence/status

Do not communicate "high confidence" only through color.

------------------------------------------------------------------------

# 83. Language

Primary MVP language:

-   English

The UI should use simple international English.

Future localization may include:

-   Hindi
-   Garhwali
-   Kumaoni
-   other Indian languages

Do not build full localization infrastructure unless time allows without
affecting the core scope.

------------------------------------------------------------------------

# 84. Attribution

The application must respect the attribution and terms required by:

-   Google Maps Platform
-   Google Places
-   NASA/FIRMS
-   any future government data source

Do not remove required attribution.

Do not imply that NASA or Google endorses the application.

------------------------------------------------------------------------

# 85. Security Baseline

Even though the app has no authentication, it still needs basic
security.

Implement:

-   HTTPS
-   protected server environment variables
-   restricted Google API keys
-   no secrets in Git
-   basic input validation
-   safe JSON parsing
-   reasonable request limits on public server endpoints
-   dependency updates where practical

Do not build a large security system for a public read-only MVP.

------------------------------------------------------------------------

# 86. Performance Targets

Aim for:

-   fast initial screen
-   map visible quickly
-   detections loaded asynchronously
-   smooth pan/zoom
-   no obvious UI freezes
-   minimal memory use
-   reasonable behavior on mid-range Android devices

Avoid loading unnecessary historical data.

------------------------------------------------------------------------

# 87. API Request Optimization

For FIRMS:

-   query only required geographic area
-   use recent windows
-   cache
-   do not poll every few seconds
-   do not issue requests from every marker
-   do not fetch data separately for every screen

For Places:

-   debounce user typing
-   use session tokens
-   request minimal fields
-   avoid duplicate Place Details calls
-   cache selected destination during the session

------------------------------------------------------------------------

# 88. No Polling Explosion

Do not implement:

``` text
Every screen
  → every 10 seconds
  → FIRMS
```

Instead:

``` text
One shared data request
        ↓
Normalized result
        ↓
Map
List
Home
Destination
```

The same fire dataset should be reused across screens.

------------------------------------------------------------------------

# 89. Data Repository Pattern

Conceptually:

``` text
FireRepository
   ├── getRecentDetections()
   ├── getDetectionsForBounds()
   ├── getDetectionsNearLocation()
   └── getLastUpdated()
```

The UI should not know how FIRMS works.

This abstraction makes future FSI/other sources easier to add.

------------------------------------------------------------------------

# 90. Source Adapter Pattern

Future-friendly architecture:

``` text
FireDataSource
   ├── FirmsSource
   ├── FsiSource
   └── FutureSource
```

Each source produces normalized observations.

This is preferable to scattering source-specific parsing throughout the
application.

------------------------------------------------------------------------

# 91. Repository Deliverables

The final repository should contain:

-   Expo React Native source
-   TypeScript source
-   Expo application configuration
-   API/data-service source if applicable
-   environment-variable example
-   README
-   this context file
-   setup instructions
-   build instructions
-   testing instructions
-   API configuration instructions
-   source attribution information

Do not commit:

-   production API keys
-   certificates
-   signing credentials
-   private client credentials

------------------------------------------------------------------------

# 92. README Requirements

The project README should explain:

1.  What the app does
2.  Tech stack
3.  How to install
4.  How to configure environment variables
5.  How to obtain/configure FIRMS MAP_KEY
6.  How to configure Google Maps
7.  How to configure Places
8.  How to run Android
9.  How to run iOS
10. How to build release versions
11. Known limitations
12. Data-source notes

------------------------------------------------------------------------

# 93. Environment Example

Provide something like:

``` text
# Fire data
FIRMS_MAP_KEY=

# Google Maps
GOOGLE_MAPS_API_KEY_ANDROID=
GOOGLE_MAPS_API_KEY_IOS=

# Google Places, if server-side
GOOGLE_PLACES_API_KEY=
```

The actual repository may use platform-specific native configuration for
Google Maps keys.

------------------------------------------------------------------------

# 94. Build Process

## Android

Expected output:

``` text
APK
```

and optionally:

``` text
AAB
```

if required later for Play Store.

## iOS

Expected:

-   successful Xcode build
-   archive/build preparation
-   configuration ready for client account

Final App Store submission is dependent on client developer account,
signing, certificates, store metadata, review, and Apple's process.

------------------------------------------------------------------------

# 95. Deployment Responsibility

The client provides the developer accounts.

The developer provides:

-   technical build configuration
-   build generation
-   deployment assistance
-   required technical handover

Store review and third-party platform approval are outside the
developer's control.

------------------------------------------------------------------------

# 96. Scope Change Protocol

If a request appears during development:

### Step 1

Check this file.

### Step 2

Determine whether the feature is included.

### Step 3

If not included, label it:

``` text
SCOPE CHANGE
```

### Step 4

Do not implement it silently.

### Step 5

Assess the scope impact separately.

This is especially important for:

-   dashboards
-   notifications
-   authentication
-   AI
-   new APIs
-   government integrations
-   GIS analysis
-   new platforms

------------------------------------------------------------------------

# 97. AI Coding Agent Rules

Any AI coding agent working on this repository must follow these rules.

## Rule 1 --- Inspect before editing

Read the existing repository before making architectural changes.

## Rule 2 --- Do not invent APIs

Only use fields verified in official API documentation or confirmed from
actual responses.

## Rule 3 --- Do not invent UI data

If a screen design contains a field that the API cannot provide, remove
it or redesign the component.

## Rule 4 --- No fake production data

Mock data is permitted only in development mode.

## Rule 5 --- No ML

Do not introduce ML libraries or prediction logic.

## Rule 6 --- No authentication

Do not introduce login/authentication for the MVP.

## Rule 7 --- No web dashboard

Do not create a web monitoring dashboard as part of this mobile MVP.

## Rule 8 --- No unnecessary APIs

Do not add Google Routes, Navigation, Street View, Earth Engine,
Sentinel, or other APIs without explicit scope approval.

## Rule 9 --- Protect secrets

Never commit API keys.

## Rule 10 --- Preserve source truth

Keep raw source values when normalizing.

## Rule 11 --- Make limitations visible

Do not turn "no detections returned" into "no fire exists."

## Rule 12 --- Keep the architecture extensible

Use clear data-source and repository abstractions without building
enterprise infrastructure.

------------------------------------------------------------------------

# 98. Agent Definition of Done

Before declaring a feature complete, the coding agent should verify:

-   Does the required data actually exist?
-   Is the field actually returned by the API?
-   Is the source authoritative for that field?
-   Is the timestamp correctly interpreted?
-   Is the unit correct?
-   Does the UI explain the data accurately?
-   Does it work on Android?
-   Does it work on iOS?
-   Does the API fail gracefully?
-   Does the feature stay within scope?
-   Are secrets protected?
-   Are unnecessary API calls avoided?

------------------------------------------------------------------------

# 99. Product Language Rules

Preferred terms:

-   satellite detection
-   thermal anomaly
-   recent detection
-   observed
-   latest available
-   near-real-time
-   satellite-derived
-   source
-   confidence class

Avoid unless technically justified:

-   confirmed fire
-   exact fire size
-   fire danger
-   safe
-   unsafe
-   emergency
-   evacuation
-   guaranteed live
-   prediction
-   forecast

------------------------------------------------------------------------

# 100. What Makes This Product Different

The differentiation is not "we have a fire API."

NASA already provides fire data.

The product value is:

``` text
Reliable data
      +
Beautiful map experience
      +
Simple public language
      +
Tourist destination context
      +
Source transparency
      +
India-wide usability
      +
Cross-platform mobile UX
```

This turns an existing technical dataset into a public-facing product.

------------------------------------------------------------------------

# 101. Long-Term Vision

The long-term vision is for Agnivision to become a public
environmental awareness platform for India.

Potential future modules:

``` text
Forest Fire
    ↓
Landslide
    ↓
Flood
    ↓
Extreme Weather
    ↓
Wildlife Conflict
    ↓
Environmental Monitoring
```

However, each module should remain independently scoped and should not
be added to the current project.

The forest-fire application is the first focused product.

------------------------------------------------------------------------

# 102. Final Scope Summary

## PROMISED NOW

-   Android app
-   iOS app
-   React Native codebase
-   Google Maps
-   India-wide fire visualization
-   NASA FIRMS
-   VIIRS NOAA-20 NRT
-   VIIRS NOAA-21 NRT
-   MODIS NRT
-   Fire markers/clustering
-   Detection details
-   Current location
-   Approximate distance
-   Destination/place search
-   Tourist destination situation
-   Recent activity
-   Source transparency
-   Basic sharing
-   Loading/error/empty states
-   Android APK/build
-   iOS build preparation
-   Source code
-   Technical handover
-   Target delivery within approximately 20 days

## NOT PROMISED NOW

-   Web application
-   Web dashboard
-   Officer dashboard
-   Admin dashboard
-   Authentication
-   Push notification system
-   AI/ML
-   Fire prediction
-   Fire-spread forecasting
-   Sentinel processing
-   GIS polygons
-   Burn-area analysis
-   Forest health analysis
-   Drone integration
-   Government incident management
-   Field reporting
-   Emergency dispatch
-   Navigation
-   Landslide/flood/wildlife modules

------------------------------------------------------------------------

# 103. Final Engineering Statement

Agnivision MVP should be built as a **small, reliable,
source-driven public information application**, not as a miniature
version of a government command center.

The most important engineering objective is not to maximize the number
of features.

It is to make the following flow work exceptionally well:

``` text
Reliable satellite data
        ↓
Correct normalization
        ↓
Fast API layer
        ↓
Beautiful Google Map
        ↓
Simple detection information
        ↓
Destination-aware context
        ↓
Transparent source/timestamp
        ↓
Useful public experience
```

If this foundation is implemented correctly, the same architecture can
later grow into a much larger environmental intelligence platform.

For the current release, however:

**Keep it focused.\
Keep it truthful.\
Keep it fast.\
Keep it beautiful.\
Do not invent data.\
Do not expand scope silently.**

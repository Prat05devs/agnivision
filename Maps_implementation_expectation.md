AI AGENT BRIEF — Agnivision Google Maps Experience
Mission

You are implementing the core Google Maps visualization experience for Agnivision, a React Native Android/iOS application that visualizes recent satellite forest-fire / thermal-anomaly detections across India.

This is not a generic map screen.

The map is one of the primary reasons this application exists.

The final experience should feel like a polished consumer product comparable in interaction quality to modern weather, travel, hazard-monitoring and live-location applications.

The user should feel:

“I can open India, immediately understand where activity exists, zoom naturally into any region, inspect an individual satellite detection, search my destination, and understand what is happening around that destination.”

The map should feel calm, responsive, intelligent and visually premium.

1. CURRENT STATE OF THE PRODUCT

A substantial portion of Agnivision already exists.

The current application already has:

React Native mobile application structure
Home screen
Recent fire-activity information
FIRMS-backed detection data
VIIRS / MODIS detection information
Detection-details interface
Destination / tourism-oriented experience
Recent Activity screen
Time filters
Satellite filters
Confidence filters
Source information
FRP
brightness information
coordinates
current-location concept
bottom navigation
Agnivision design language
green / forest / fire-orange visual identity

The current main navigation is approximately:

HOME
MAP
ACTIVITY
MORE

This should remain simple.

The major unfinished part is:

the production-quality interactive Google Map.

Do not redesign the entire application.

Your job is to make the existing map experience match the quality of the rest of the product.

2. PRODUCT PHILOSOPHY

Agnivision does not exist simply to display dots.

NASA FIRMS already provides technical fire data.

Our job is:

Raw satellite detections
        ↓
Visual organization
        ↓
Geographic context
        ↓
Human-readable interaction
        ↓
Useful public information

The map therefore needs to answer:

Where is activity occurring?

How much activity exists in a region?

What happens when I zoom closer?

What exactly did the satellite detect?

How far is that detection from me?

How far is it from the destination I am visiting?

3. CORE RULE
Zoom must reveal information.

Do not think about zoom as simply:

“the Google Map became larger.”

Think of it as an information hierarchy.

Every zoom level should progressively reveal more information.

This is one of the most important design concepts in the application.

Google Maps itself uses zoom in this way: roughly speaking, lower zoom levels represent landmass/region scale, around zoom 10 is city scale, around 15 is street scale, and progressively more detail becomes available as zoom increases.

Agnivision should apply the same principle to fire information.

4. MAP INFORMATION HIERARCHY

Treat these numbers as initial tuning ranges, not sacred constants. Test them on phones and tablets.

LEVEL A — INDIA OVERVIEW

Approximate zoom:

4 – 5.5

The user should see virtually all of India.

At this level:

DO NOT show hundreds of individual fire markers.

Instead show regional clusters.

Example:

                 ● 18

       ● 7

                         ● 42

                 ● 11

Each cluster represents detections located geographically near each other.

The cluster should clearly contain the count.

Example:

42

not:

🔥🔥🔥🔥🔥🔥🔥
Purpose

The user should instantly understand:

“Fire activity is concentrated here, here and here.”

without being overwhelmed.

5. INDIA VIEW SHOULD FEEL CLEAN

When the app first opens the map:

Camera should fit India comfortably.

Do not:

show the entire world;
zoom too tightly into one state;
render 600 markers;
immediately open a bottom sheet;
animate randomly.

Initial state:

India centered
+
clusters visible
+
search accessible
+
current-location control
+
time filter visible

The map must feel intentional from the first frame.

6. LEVEL B — REGIONAL / STATE VIEW

Approximate zoom:

5.5 – 7.5

Now clusters should begin breaking apart.

Example:

India view:

● 46

Zoom toward Uttarakhand.

It might become:

● 12       ● 9

      ● 17

                    ● 8

The information becomes more granular.

The user should feel:

“Now I'm understanding which part of Uttarakhand / Himachal / Maharashtra contains activity.”

Do not yet force every raw detection onto the screen if density remains high.

7. LEVEL C — DISTRICT / LOCAL REGION

Approximate zoom:

7.5 – 10

Clusters begin turning into individual detections where density allows.

Example:

● 4

     ◉    ◉

             ◉

          ● 3

This hybrid state is important.

It is perfectly acceptable to have:

clusters in dense areas;
individual detections in sparse areas.

Don't artificially enforce one representation for the entire viewport.

8. LEVEL D — CITY / DESTINATION

Approximate zoom:

10 – 13

Individual detections become primary.

Example:

          ◉

Chopta

                   ◉

     ◉

At this level we can meaningfully display:

individual satellite detection
selected destination
current user location
approximate proximity

This is where the tourism use case becomes powerful.

9. LEVEL E — CLOSE DETECTION VIEW

Approximate zoom:

13+

The user can inspect a specific thermal detection.

Map should remain relatively simple.

Do not suddenly introduce:

random forest polygons;
imaginary fire perimeter;
heatmap;
smoke animation;
route navigation.

We do not have those datasets.

The map continues to show the exact satellite point.

10. CLUSTER BEHAVIOR

This is critical.

Google's official Maps utility libraries support marker clustering specifically so applications can display large numbers of points without making the map unreadable. Google documents the expected behavior as clusters while zoomed out → individual markers when zoomed in.

Our implementation should follow that pattern.

A cluster should look custom to Agnivision.

Not the default Google cluster.

Conceptually:

      ┌─────┐
      │ 27  │
      └─────┘

but circular.

Potential appearance:

outer soft orange halo
inner deep forest / charcoal circle
white count
tiny orange accent

or:

orange translucent cluster
white count
subtle glow

Keep it premium.

Not cartoonish.

11. CLUSTER TAP

Do NOT treat cluster tap as merely:

zoom = zoom + 1

A more polished experience:

user taps cluster
      ↓
determine cluster children/bounds
      ↓
animate camera to fit those detections
      ↓
cluster separates naturally

Google's example demonstrates zooming the map when a cluster is tapped; we should take this further and fit the actual cluster bounds where possible.

The animation should feel deliberate.

Approximately:

300–500 ms

depending on platform behavior.

Not:

instant teleport

and not:

2-second cinematic animation
12. THE “ZOOM EFFECT”

This is the interaction we discussed previously.

Imagine:

INDIA

User sees:

● 51

around north India.

They pinch.

The single cluster smoothly becomes:

● 17        ● 12

       ● 9

                   ● 13

They pinch again.

Those become:

● 5

    ◉   ◉   ◉

         ● 3

              ◉

Another zoom:

◉    ◉

      ◉

              ◉

This should feel almost like information unfolding from the geography.

Not like:

markers disappear
screen flashes
new markers suddenly pop
13. CLUSTER TRANSITION ANIMATION

Use subtle animation where technically stable.

Potential:

cluster
  ↓ fade/scale
individual detections

Animation target:

150–220ms

No bouncing.

No exaggerated spring effects.

This is safety/environmental information.

Motion should feel calm.

14. PERFORMANCE OVER ANIMATION

Animation should never make the map lag.

Google's current ecosystem explicitly warns that animating large marker sets can reduce frame rate, so clustering and selective animation are more important than animating everything.

Priority:

Smooth map gestures
>
Correct markers
>
Smooth clustering
>
Pretty marker animations

Never sacrifice map performance for decoration.

15. DETECTION MARKER

Do not use Google's default red pin.

Create an Agnivision detection marker.

It should communicate:

satellite thermal detection

rather than:

restaurant location.

Possible design:

       ◉

Small circular thermal point.

Orange / fire accent.

Perhaps:

orange center
subtle outer ring

Avoid a huge flame icon covering the map.

16. MARKER SIZE

Marker must remain readable without dominating geography.

Approximate design:

Normal:

20–26 px visual body

Selected:

28–34 px

Exact native rendering needs device testing.

Do not create 60px fire icons everywhere.

17. SELECTED MARKER

When user taps a marker:

Normal:

◉

Selected:

◎

or slightly enlarged with glow/ring.

Animation:

scale 1.0 → 1.15

approximately.

No bouncing pin.

No fire animation.

18. MARKER TAP FLOW
Tap detection
      ↓
Set selectedDetection
      ↓
Marker becomes selected
      ↓
Camera subtly repositions
      ↓
Bottom sheet appears

Important:

When the bottom sheet opens, the marker should not end up hidden behind it.

Offset camera upward.

Example:

             selected point

                  ◉


--------------------------------
Detection information sheet
--------------------------------

not:



--------------------------------
Detection information sheet
   ◉ hidden behind sheet
--------------------------------
19. DETECTION PREVIEW SHEET

Do not immediately navigate away from map.

Tap marker → compact bottom sheet.

Example:

SATELLITE DETECTION

60 km E of Pune, Maharashtra

VIIRS · NOAA-20
Observed 1h ago

Confidence
Nominal

FRP
14.7 MW

View Details →

The map remains visible behind it.

This maintains geographical context.

20. EXPANDED DETECTION VIEW

User can:

tap View Details

or swipe bottom sheet upward.

Show:

Detection Location

Approximate Place

Latitude
Longitude

Observed

Satellite

Sensor

Confidence

FRP

Brightness

Day / Night

Source
NASA FIRMS

Only display actual available data.

21. DO NOT INVENT FIRE DATA

Absolutely do NOT infer:

fire perimeter
area burned
containment %
number of firefighters
spread direction
severity
evacuation
road closure
start time
affected population

from FIRMS point data.

If the data isn't available:

don't show it.

22. TERMINOLOGY

Preferred:

Satellite Detection

or:

Thermal Anomaly

Maybe:

Satellite Fire Detection

Avoid:

Confirmed Fire

unless future official verification exists.

23. CURRENT LOCATION

Control:

◎

Bottom-right floating map button.

Tap:

request permission if needed
      ↓
obtain GPS coordinate
      ↓
smooth camera animation
      ↓
user-location blue/Agnivision point

Do not track continuously in background.

24. DESTINATION SEARCH

Search is essential because of tourism.

Top search control:

Search a city or destination

Examples:

Nainital
Chopta
Mussoorie
Auli
Manali
Shimla
Munnar
Hampi

Flow:

Search
 ↓
Google Places suggestions
 ↓
Select place
 ↓
coordinates
 ↓
animate camera
 ↓
show destination marker
 ↓
calculate nearby detections
25. DESTINATION MARKER

Destination should visually differ from fire detection.

Example:

destination = map pin / location ring

fire detection = thermal circle

Never use same visual symbol.

26. DESTINATION MAP EXPERIENCE

Suppose user searches:

Chopta

Camera should animate to a useful zoom around Chopta.

Not street-level.

Something approximately regional:

zoom ~9–11

depending on density and device.

Then display:

Chopta marker
+
nearby satellite detections
27. DESTINATION SITUATION SHEET

Potential bottom sheet:

CHOPTA
Uttarakhand

Recent Satellite Activity

2 detections within 25 km

Nearest
18 km

Latest observation
2h ago

View detections →

If none:

No recent satellite detections
found within 25 km.

Not:

Chopta is safe.
28. DESTINATION RADIUS

A subtle radius visualization could be used when useful.

Example:

         ( 25km radius )

              📍
            Chopta

Do not show radius constantly.

Show when:

destination selected;
nearby-detection analysis active.

Possible default:

25 km

Potential options:

10 km
25 km
50 km

But only add if UX remains simple.

29. CAMERA PHILOSOPHY

The camera should feel intelligent.

There are four types of movement.

User-driven

Pinch/pan.

Never interfere.

Search-driven

Animate to selected place.

Cluster-driven

Fit cluster bounds.

Marker-driven

Subtle re-center to expose marker above bottom sheet.

Do not continuously fight user's camera.

30. DO NOT SNAP CAMERA AFTER USER PAN

Bad:

user pans
      ↓
API refresh happens
      ↓
camera jumps back to India

Never.

Data refresh must not alter camera.

31. PRESERVE MAP STATE

If user:

Map
 ↓
opens detection
 ↓
View Details
 ↓
Back

return to:

same camera;
same zoom;
same selected area;
same filters.

Do not reset India view.

This is a small detail that strongly affects perceived quality.

32. MAP FILTERS

Current filters already exist elsewhere.

Map can expose compact versions.

Potential horizontal chips:

24h
3 days
5 days

All
VIIRS
MODIS

Maybe:

Confidence

opens sheet.

Do not permanently occupy half the map with controls.

33. FILTER TRANSITION

When filter changes:

Bad:

clear entire map
blank
wait
markers appear

Preferred:

existing dataset
 ↓
filter locally if possible
 ↓
clusters transition

If API request required:

retain previous data with subtle loading indicator until replacement is available.

34. MAP / ACTIVITY SYNCHRONIZATION

Activity and Map represent the same detection dataset.

They must share:

timeRange
sensor
confidence

If user filters:

Last 24h + VIIRS

on Activity and goes Map:

prefer preserving the same filters.

This creates a coherent product.

35. MAP → ACTIVITY

Potential option:

View as List

Map filters should carry into list.

Similarly list detection tap can open:

Show on Map

and animate to that detection.

36. MAP STYLE

The base map should feel like Agnivision.

Use Google Cloud map styling if available.

Desired:

restrained POI density;
strong geography;
visible major roads;
readable cities;
subtle land colors;
forest-friendly neutral/green tone;
water slightly muted;
fire markers remain the highest visual priority.

Do not turn the map dark green everywhere.

The geographic map must remain readable.

37. DAY / DARK MAP

If implementing dark mode:

Use a genuinely designed dark map style.

Not simply:

invert colors

Dark mode should maintain:

readable city names;
road hierarchy;
high marker contrast;
clear water/land differentiation.

This is optional if timeline becomes tight.

38. EMPTY MAP STATE

If selected area has no detections:

Do not display an empty map with no explanation.

Bottom sheet / toast:

No recent satellite detections
found in this area.

Time range: Last 24h

Again:

not:

No fires.
39. DATA REFRESH

When new FIRMS data arrives:

Do not reset camera.

Do not visually flash.

Update marker dataset.

If a new detection enters current viewport:

subtle marker fade-in.

Possibly show:

3 new detections

small toast.

User can tap:

View

Optional.

40. DATA FRESHNESS

Map should expose:

Updated 4 min ago

somewhere subtle.

Tap could reveal:

Data source: NASA FIRMS
Latest fetch: 14:20 IST

This is critical for credibility.

41. CLUSTER COUNT DOES NOT MEAN FIRE COUNT

Important semantic requirement.

If a cluster displays:

24

that means:

24 satellite detection records

not:

24 forest fires.

Where necessary, tooltip:

24 detections
42. PERFORMANCE STRATEGY

We may have hundreds or thousands of points.

Do not build:

600 custom React Views

with complex shadows, SVGs and animations.

Recommended considerations:

cluster data;
use lightweight image markers where possible;
memoize;
avoid marker re-render on unrelated state;
update markers only when data/filter/bounds change;
avoid tracksViewChanges-style continuous marker rendering;
minimize expensive React children;
reuse one normalized dataset.

Google's clustering utility documentation even includes a demonstration with 2,000 markers, which is exactly why clustering exists.

43. REACT NATIVE / iOS WARNING

Before choosing a marker implementation, inspect:

React Native version
react-native-maps version
New Architecture/Fabric enabled?
iOS provider?

Recent react-native-maps issues report custom Google Maps markers disappearing or becoming untappable on iOS under some Fabric/New Architecture combinations.

Therefore:

Do not assume Android success means iOS success.

Test:

iPhone simulator
+
physical iPhone if possible

early.

Not on Day 20.

44. PREFER SIMPLE MARKER IMAGES

Because of map performance and platform stability:

Prefer:

native/static marker image

over:

deep React component
   ↓
multiple Views
   ↓
gradient
   ↓
shadow
   ↓
text
   ↓
animation

Cluster markers may require custom rendering, but keep them lightweight.

45. CLUSTERING IMPLEMENTATION

Agent should evaluate the existing project before choosing implementation.

Possible approaches:

A. Native Google utility clustering

Best performance/native alignment, but React Native integration may require bridge/native handling.

Google officially supports customizable clustering algorithms/renderers on Android and iOS.

B. Supercluster-style JS clustering

Potentially practical in React Native.

Concept:

FireDetection[]
   ↓
GeoJSON points
   ↓
cluster index
   ↓
getClusters(viewportBBox, zoom)
   ↓
render clusters/points

Evaluate current dependency health and architecture before adopting.

Do not install a random outdated React Native clustering package simply because it exists.

46. VIEWPORT-AWARE CLUSTERING

Ideal approach:

map region changes
       ↓
get viewport bounds
       ↓
get integer zoom
       ↓
calculate visible clusters
       ↓
render only needed points

This minimizes visual and computation load.

47. MAP EVENT THROTTLING

Do not recalculate clusters on every pixel of pan.

During gesture:

native map moves smoothly

When movement settles:

onRegionChangeComplete
       ↓
recalculate clusters

Potential short debounce:

100–200ms

depending on measured performance.

48. TABLET SUPPORT

Map needs responsive controls.

Phone:

search top
filters below
bottom sheet

Tablet portrait:

Use same concept but wider.

Tablet landscape can optionally use:

Map        | Details panel
           |
           |

rather than giant bottom sheet.

Do not hardcode phone dimensions.

49. SAFE AREA

Respect:

iPhone Dynamic Island;
notch;
Android status bar;
bottom navigation;
gesture bar.

Floating controls must never collide with these.

50. ACCESSIBILITY

Markers are inherently difficult for accessibility.

Provide equivalent list experience.

Map controls need labels:

Current location
Zoom to India
Search destination
Filter detections

Don't encode confidence only through marker color.

51. HAPTICS

Optional but premium.

Marker tap:

very light haptic.

Cluster tap:

light haptic.

Destination selected:

light success.

Do not haptic on every map gesture.

52. PRODUCT MOTION LANGUAGE

The map should feel:

smooth
calm
precise
fast

Not:

bouncy
gaming-like
flashy

Animation communicates continuity.

53. KEY VISUAL EXPERIENCE

The ideal experience:

User opens map

India appears

Regional fire clusters appear

         31
       ●

                   18
                  ●

     7
    ●

User pinches into North India

Clusters split smoothly

        8
       ●

                12
               ●

           ◉

User pinches into Uttarakhand

    ◉
             ◉

        ● 3

User taps detection

marker becomes selected

        ◎

camera moves slightly upward

bottom sheet rises

NASA FIRMS
VIIRS NOAA-20

Observed 38 min ago

18 km from Chopta

That is the experience we are trying to build.

54. WHAT MAKES THIS PRODUCTION-GRADE

Production grade does not mean adding more features.

It means:

The map doesn't lag.
Markers don't flicker.
Zoom feels natural.
Clusters make geographic sense.
Marker selection is obvious.
Camera doesn't jump unexpectedly.
Bottom sheets don't hide markers.
Filters don't reset the map.
API refresh doesn't reset state.
Location permission denial doesn't break the app.
Thousands of points don't overwhelm the device.
Android and iOS behave consistently.
Tablet layouts don't stretch awkwardly.
Data terminology is scientifically correct.
Stale data is clearly labeled.
API failures are graceful.
Every interaction has a clear purpose.
55. THINGS THE AGENT MUST NOT DO

Do NOT:

put all detections on screen without clustering;
use Google default red pins;
introduce fire polygons;
invent heatmap intensity;
invent fire perimeter;
create predicted spread;
continuously poll FIRMS from the map component;
make each marker fetch its own data;
re-center the map whenever data refreshes;
reset camera on navigation;
use giant animated flame markers;
add navigation/routes;
add complex GIS;
add Python processing;
introduce ML;
redesign Home;
change existing visual identity;
modify unrelated screens;
introduce authentication.
56. ARCHITECTURE EXPECTATION

Map data flow should look approximately like:

NASA FIRMS
     ↓
existing normalized detection service
     ↓
FireDetection[]
     ↓
shared app state/repository
     ↓
filters
     ↓
map viewport
     ↓
clustering
     ↓
renderable clusters + detections
     ↓
Google Map

Map components should never know the ugly raw FIRMS CSV format.

They consume normalized:

FireDetection

objects.

57. RECOMMENDED MAP STATE

Conceptually:

type MapState = {
  camera: CameraState;

  selectedDetectionId: string | null;

  selectedDestination: Destination | null;

  currentLocation: Coordinate | null;

  filters: {
    timeRange: "24h" | "3d" | "5d";
    sensor: "ALL" | "VIIRS" | "MODIS";
    confidence:
      | "ALL"
      | "HIGH"
      | "NOMINAL"
      | "LOW";
  };

  mapReady: boolean;
};

Data itself should stay separate.

58. ACCEPTANCE TEST — INDIA VIEW

Pass if:

India is visible;
map loads reliably;
recent FIRMS points are represented;
clusters are visible;
no massive marker overlap;
pan/zoom is smooth;
cluster count updates naturally.
59. ACCEPTANCE TEST — ZOOM

Pass if:

India
 ↓ zoom
regional clusters
 ↓ zoom
smaller clusters
 ↓ zoom
individual detections

is visually understandable.

No flicker.

No major frame drops.

60. ACCEPTANCE TEST — MARKER

Pass if:

marker tap is reliable;
selected state visible;
bottom sheet opens;
marker remains visible above sheet;
details correspond to correct detection;
closing restores normal state.
61. ACCEPTANCE TEST — TOURIST

Search:

Chopta

Pass if:

correct place selected;
camera moves naturally;
destination marker appears;
nearby detections remain visible;
nearest detection distance calculated;
user understands the relationship between destination and fire activity.
62. ACCEPTANCE TEST — DEVICE LOCATION

Pass if:

permission requested correctly;
location appears;
nearby activity can be understood;
denying permission does not break map.
63. ACCEPTANCE TEST — DATA FAILURE

Simulate FIRMS failure.

Pass if:

map still opens;
cached data used when available;
freshness message shown;
app does not crash.
64. ACCEPTANCE TEST — ANDROID/iOS

Test identical flows:

load
pan
pinch
cluster tap
marker tap
sheet
search
location
filters
back navigation

on both platforms.

Do not accept:

“Works on Android; we'll probably fix iOS later.”

65. FINAL PRODUCT STANDARD

This map should not feel like:

“A developer integrated Google Maps.”

It should feel like:

Agnivision has its own geographic intelligence interface.

Google Maps is only the underlying engine.

The Agnivision product layer is:

Google geography
       +
NASA satellite detections
       +
our clustering
       +
our visual hierarchy
       +
our interaction model
       +
our tourism context
       +
our information design

That is what makes the map ours.

66. FINAL INSTRUCTION TO THE CODING AGENT

Before writing code:

inspect the entire existing project;
run it;
understand the current FIRMS data model;
inspect current dependencies;
inspect React Native version;
inspect react-native-maps version;
confirm Android Google Maps configuration;
confirm iOS Google Maps configuration;
confirm current filter state architecture;
identify how Detection Details currently receives detection objects.

Then produce an implementation plan.

Do not immediately rewrite the map.

Implement incrementally:

Step 1
Google Map renders correctly Android + iOS

Step 2
One real detection marker

Step 3
All normalized points

Step 4
Clustering

Step 5
Zoom hierarchy

Step 6
Marker selection

Step 7
Bottom sheet synchronization

Step 8
Search destination

Step 9
Current location

Step 10
Filter synchronization

Step 11
Performance

Step 12
Tablet responsiveness

Step 13
Production testing

Within each stage, use only the focused check needed to continue safely. Run the full
verification suite after each four-stage batch, following the gates in the companion
implementation plan. Native builds and device verification remain separately
authorized release checks.

The one sentence I want the agent to remember

Zooming into Agnivision should feel like zooming from understanding the national fire situation, to understanding a region, to understanding a specific satellite observation—without ever overwhelming the user with raw data.
> **Current density revision (2026-09-03):** Numeric cluster-marker requirements in
> this earlier brief have been superseded. Regional groups now appear only as an
> equal-per-observation thermal density surface; warm colors indicate increasing
> concentration and the densest cores reach red. Tapping a hotspot preserves the
> zoom/drill-down behavior, while individual markers appear only at close zoom. See
> `MAP_IMPLEMENTATION.md` for the implemented behavior.

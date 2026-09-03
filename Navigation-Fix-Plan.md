# Agnivision — Device Adaptation & Navigation Fix Plan
### Audience: AI coding agent implementing the feature

---

## 1. Purpose

Two bugs surfaced from real APK testing on an Android device:

- **A.** App content is drawn under the status bar at the top and has no clearance
  above the system navigation area at the bottom (gesture pill or 3-button bar).
- **B.** The hardware back button and the edge swipe-back gesture exit the app
  entirely instead of navigating to the previous screen.

Both are common, well-understood React Native issues with established, standard
fixes — this is not an architecture rewrite. This document identifies the likely
root causes and gives a concrete diagnose → fix → verify plan for each.

---

## 2. Issue A — Content Overlapped by System Bars

### 2.0 The actual requirement — read this before doing anything else

**The goal is not "leave enough space at the top and bottom to clear what we saw
on our test device."** That would just be a fixed number that happens to work
for one phone. The requirement is that the app **queries the real system state
at runtime, on every device, and adapts its layout to whatever that device
reports** — automatically, with no hardcoded assumption baked in anywhere.

Concretely, that means the layout must correctly handle, without any
device-specific special-casing in the app's own code:

- Any screen size and aspect ratio, phone or tablet
- A notch, a punch-hole camera, or no cutout at all
- Gesture navigation (a thin swipe area at the bottom) **or** the classic
  3-button navigation bar (a taller, fixed system bar) — these report very
  different bottom-inset values, and the layout must respond to whichever one
  the current device is actually using, not assume one or the other
- Split-screen / multi-window mode, and rotation, if the app supports either
  (insets change dynamically when either happens — content must reflow, not
  stay fixed to values captured once at launch)
- Whatever the device reports today **and** whatever a future OS version
  reports differently — which is exactly why this has to be solved by reading
  live inset values rather than encoding today's Android/iOS behavior as a
  constant

If a fix works by hardcoding a padding value — even one derived by measuring the
test device precisely — it is not the fix. It will visibly break the first time
it's run on a phone with different bar heights, and there is no way to predict
every combination of device this app will run on. The only correct approach is
one that never assumes a number and always asks the OS what the current safe
area actually is, every time it could change.

### 2.1 Most likely root cause

Android 15 (API 35) made **edge-to-edge display the default** for apps targeting
SDK 35 — app content now draws behind the system status bar and navigation bar
automatically unless the app explicitly insets its own content to avoid them. If
the project targets SDK 35 (or will soon, since the Play Store has been moving
toward requiring it), this is almost certainly the exact mechanism behind what
was observed — it's not device-specific flakiness, it's the new default.

### 2.2 The correct pattern

- A single `SafeAreaProvider` (from `react-native-safe-area-context`) at the true
  app root, above everything else.
- Use the **`useSafeAreaInsets()` hook** to pad screen content — this is now the
  officially recommended approach over the `SafeAreaView` component, which has
  known limitations on Android.
- **Don't** wrap the entire app in one top-level `SafeAreaView`/inset-padded
  container — apply insets per-screen, at the content level. A single blanket
  wrap tends to double-pad nested screens and headers.
- React Navigation's **built-in chrome already handles this automatically** —
  headers and the bottom tab bar (`@react-navigation/bottom-tabs`) apply proper
  insets on their own. First check whether the app's bottom nav (`HOME / MAP /
  ACTIVITY / MORE`) is actually using that built-in component. If it was built
  as a custom View instead, it needs explicit `insets.bottom` padding added by
  hand.
- **Every custom floating control from the Thermal Map plan needs explicit inset
  handling** — none of these are covered automatically, since they're not part
  of a navigator's built-in chrome: the destination search bar (top), filter
  chips, the current-location floating button (bottom-right), and the detection
  bottom sheet. Audit each one specifically.
- Android: confirm the edge-to-edge flag is actually set consistently (either
  `edgeToEdgeEnabled` in `app.json` if on Expo, or the equivalent Gradle property
  if bare) so what the OS is doing and what `useSafeAreaInsets()` reports to JS
  actually match — a mismatch here is a common cause of insets being reported as
  `0` while the system bar is still very much there.
- iOS: prefer `contentInsetAdjustmentBehavior="automatic"` on `ScrollView` /
  `FlatList` so scrollable lists handle insets natively rather than needing
  manual padding math layered on top.

### 2.3 A gotcha to test for while fixing this

Enabling edge-to-edge changes how Android resizes the layout when the keyboard
opens (`windowSoftInputMode="adjustResize"` behaves differently under
edge-to-edge). **Specifically test the destination search input** after this fix
— it's exactly the kind of field that can end up hidden behind the keyboard once
edge-to-edge is properly enabled, even though it worked before. If it breaks,
`react-native-keyboard-controller` is the current recommended solution rather
than trying to patch `KeyboardAvoidingView` behavior manually.

### 2.4 Phased checklist

- [ ] Confirm project type (Expo managed / bare RN) and current `targetSdkVersion`
- [ ] Confirm `react-native-safe-area-context` is installed and `SafeAreaProvider`
      wraps the true app root (not duplicated deeper in the tree)
- [ ] Confirm the edge-to-edge flag is explicitly set (not left to default
      behavior) so JS-reported insets match actual system bar state
- [ ] Audit every screen's top-level content padding — replace any hardcoded
      `paddingTop` / `marginTop` status-bar guesses with `useSafeAreaInsets().top`
- [ ] Confirm the bottom tab bar is the library's built-in component; if custom,
      add `insets.bottom` padding to it directly
- [ ] Add explicit inset padding to every floating map control (search, filters,
      location button, bottom sheet) individually
- [ ] Re-test the destination search flow specifically for keyboard-covering-input
      regressions per Section 2.3
- [ ] Verify on: a notch device, a punch-hole/status-bar-only device, a
      gesture-nav device, and a 3-button-nav device — these report different
      inset values and all four need to look correct, not just the one device
      used for initial testing

---

## 3. Issue B — Back Navigation Exits the App

### 3.1 Likely root cause candidates, ranked — check in this order

1. **Screens aren't actually being pushed onto a React Navigation stack.** Check
   whether screen-to-screen transitions use `navigation.navigate()` / `.push()`,
   versus manually swapping which component renders via local component state, or
   calling `.replace()` / `.reset()` for what should be an ordinary forward
   navigation. `.replace()` and `.reset()` both wipe navigation history — if
   those are being used where `.navigate()`/`.push()` belongs, there's genuinely
   nothing left in history for the back button to pop, and the observed behavior
   (immediate exit) is actually correct given that history state.
2. **More than one `NavigationContainer` is mounted.** React Navigation supports
   exactly one root container for the whole app. Nested or sibling containers
   each become their own isolated back-stack, and the OS back button/gesture only
   sees whichever one currently has focus as having no history to pop.
3. **`react-native-screens`'s `enableScreens()` isn't called, or the installed
   version predates proper support for the Android API level being targeted.**
   Recent Android versions (14+, and increasingly 15/16) use a native
   "predictive back gesture" system that `react-native-screens` needs to be
   current to handle correctly for both the hardware button and the edge swipe.
4. **`AndroidManifest.xml` is missing `android:enableOnBackInvokedCallback` set
   correctly for the target SDK** — this affects how modern Android intercepts
   the back gesture/button at the platform level, independent of anything React
   Navigation does.
5. **A leftover custom `BackHandler.addEventListener('hardwareBackPress', …)`**
   — common in older tutorials/boilerplate — that isn't cleaned up on unmount, or
   returns the wrong boolean, intercepting the back event before React
   Navigation's own listener gets to handle it, or double-handling it and
   popping two screens at once.

### 3.2 The correct pattern

- One `NavigationContainer` at the true root, wrapping every screen the app has
  — including Detection Details, the expanded destination sheet, and anything
  else reached by navigating away from Map or Activity.
- Forward navigation goes through `navigate()` / `push()`. Reserve `.replace()`
  and `.reset()` for the specific cases where wiping history is actually the
  intent (e.g. post-login redirect), not for normal screen-to-screen flow.
- No custom `BackHandler` code unless a specific screen genuinely needs to
  intercept back (e.g. a "discard changes?" confirmation) — and even then, follow
  React Navigation's own documented pattern for it rather than a handwritten one,
  since the interaction with the library's own listener is exactly where bugs
  like #5 above come from.

### 3.3 Why this specifically matters here

The Thermal Map plan's Map → Detection Details → Back flow, and the original
brief's requirement that returning from a detail view restores the exact prior
camera/zoom/filter state, both depend on a genuinely working navigation stack.
That behavior can't be correctly built or verified until this bug is fixed —
worth treating as a blocker for finishing out the remaining map phases, not a
parallel, lower-priority item.

### 3.4 Phased checklist

- [ ] Confirm exactly one `NavigationContainer` exists in the whole codebase
- [ ] Audit every screen transition currently in the app — flag any use of
      `.replace()`/`.reset()` that should be `.navigate()`/`.push()`
- [ ] Confirm `enableScreens()` is called and check the installed
      `react-native-screens` version against the current React Native /
      target-SDK requirements
- [ ] Check `AndroidManifest.xml` for `enableOnBackInvokedCallback` and set it
      correctly for the target SDK
- [ ] Search the codebase for any `BackHandler.addEventListener` usage; remove or
      correct any that aren't cleaning up properly or aren't returning the
      expected boolean
- [ ] Re-test: hardware back button, edge swipe-back gesture, in-header back
      button, and back after opening a screen via a deep link — all four should
      behave identically

---

## 4. Combined Verification Matrix

| Dimension | Values to test |
|---|---|
| Navigation mode | Gesture navigation, 3-button navigation |
| Display cutout | Notch, punch-hole, plain status bar (no cutout) |
| Form factor | Phone, tablet (portrait + landscape) |
| Back trigger | Hardware/gesture back, header back button, `goBack()` from a bottom-sheet close action |
| Navigation depth | Back from one level deep, back through multiple pushed screens in sequence, back immediately after a deep-link open (e.g. from a notification tap, once the Notification plan's deep-linking is built) |

Every combination in this table should produce the same, correct result: content
never hidden behind a system bar, and back always returns to the previous
in-app screen rather than exiting — never "works on the device we happened to
test on."

---

## 5. Acceptance Criteria

- [ ] No screen shows content overlapped by the status bar or the system
      navigation area, on both gesture-nav and 3-button-nav devices
- [ ] All floating map controls (search, filters, location button, bottom sheet)
      sit fully clear of system bars on every device tested
- [ ] The destination search input remains visible and usable when the keyboard
      is open, after the edge-to-edge fix
- [ ] Hardware back button, edge swipe-back gesture, and the in-header back
      button all produce the same result: pop one screen, not exit the app, not
      pop two screens
- [ ] Pressing back at the true root of the app (e.g. the Home tab with nothing
      pushed) is the only case where exiting the app is the correct behavior
- [ ] Map → Detection Details → Back restores the exact prior camera position,
      zoom, and filters, per the original brief's state-preservation requirement

---

## 6. Must Not Do

- Do not hardcode pixel padding guesses for status bar / nav bar height instead
  of reading real inset values at runtime — see Section 2.0. A value tuned to
  the test device is not a fix, it's a coincidence that will break on the next
  device tested.
- Do not wrap the whole app in a single blanket `SafeAreaView` as a shortcut —
  it causes double-padding on nested screens headers already handle themselves.
- Do not add a second `NavigationContainer` anywhere (e.g. inside a modal) as a
  quick fix for a navigation glitch — this is very likely to be a root cause of
  the current bug, not a safe pattern to add more of.
- Do not reach for `.reset()` as a general-purpose "go to this screen" call —
  reserve it for cases where wiping history is actually intended.
- Do not ship a fix that's only been verified on a single physical device —
  this bug class is inherently device/OS-version dependent; the matrix in
  Section 4 is the actual bar for "fixed," not one phone looking right.

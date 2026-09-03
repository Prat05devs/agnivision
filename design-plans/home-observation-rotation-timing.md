# Align the Home observation rotation with the five-second product contract

Written against: unavailable (the repository does not currently have a `HEAD` commit)

## Evidence chain

- Surface: `HomeScreen` → `Recent updates` → `LiveObservationCard`
- Problem: the primary green observation card advances every 10 seconds, while the governing Home-screen contract specifies an approximate five-second presentation rotation.
- Design evidence: `Agnivision-Context.md`, lines 396–405, defines the rotating observation feed, its approximate five-second cadence, and clarifies that the rotation is presentation-only rather than a new FIRMS request.
- Owner: `src/components/LiveObservationCard.tsx`
- Scope and affected surfaces: `src/screens/HomeScreen.tsx` is the only consumer of `LiveObservationCard`; the change affects the populated Home observation-card state when more than one detection is loaded.
- Uncertainty: none.

## Design decision

Set the existing presentation interval to 5,000 milliseconds. Keep the current fade/translate transition and detection ordering unchanged. This brings the rendered cadence into conformance with the documented Home experience without changing data fetching or introducing another timer owner.

## Reuse

- Existing `ROTATION_INTERVAL_MS` constant and `LiveObservationCard` interval lifecycle.
- Exemplar: the existing `setInterval` and animation sequence in `src/components/LiveObservationCard.tsx`.

## Changes

1. `src/components/LiveObservationCard.tsx`
   - Change: set `ROTATION_INTERVAL_MS` from `10_000` to `5_000`.
   - Preserve: reset-to-first behavior when the newest detection changes; no interval when zero or one detection is present; the 180 ms exit and 260 ms entrance animations; card labels, ordering, actions, and all FIRMS request behavior.
   - Verify: with at least two loaded detections, the position indicator and observation content advance approximately every five seconds without triggering a network refresh.

## Scope

- Inherit: the Home screen's populated `LiveObservationCard` state.
- Verify: Home with zero, one, and multiple detections; returning to Home after navigation; a refreshed detection collection.
- Exclude: FIRMS refresh cadence, notification scheduling, map markers, detection-card lists, animation styling, and SACHET advisories.

## Validation

- Product: open Home with multiple detections and confirm the primary green card advances through newest-loaded observations approximately every five seconds.
- Interface: confirm the position counter changes with the content, transitions remain smooth, the details action opens the currently displayed detection, and zero/one-detection states do not rotate.
- System: confirm `LiveObservationCard` retains a single interval owner and no data-fetch call is added to the rotation effect.
- Repository: `npm run typecheck` → TypeScript completes with no errors.

## Stop conditions

- Stop if another runtime owner overrides the interval, `LiveObservationCard` gains another consumer with a different documented cadence, or changing the constant would alter network polling rather than presentation only.

## Design documentation

- After acceptance and validation: none; the governing five-second decision is already recorded in `Agnivision-Context.md`.

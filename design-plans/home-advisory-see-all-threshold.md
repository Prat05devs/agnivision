# Show the Home advisory-list action whenever multiple advisories exist

Written against: unavailable (the repository does not currently have a `HEAD` commit)

## Evidence chain

- Surface: `HomeScreen` → `OfficialAdvisoriesSection`
- Problem: Home displays up to two advisory cards but only shows `See all` when more than two advisories exist. With exactly two advisories, the accepted Home contract's multiple-advisory presentation is incomplete.
- Design evidence: `SACHET-Integration-Plan.md`, lines 160–178, defines Home as a compact advisory section and specifies that multiple advisories render as a couple of cards plus `See all`.
- Owner: `src/components/OfficialAdvisoriesSection.tsx`, composed by `src/screens/HomeScreen.tsx`.
- Scope and affected surfaces: Home must use a two-advisory threshold. `OfficialAdvisoriesSection` is also consumed by `src/screens/DestinationScreen.tsx`, whose current threshold must remain unchanged.
- Uncertainty: none.

## Design decision

Make the shared advisory section's list-action threshold an explicit presentation prop. Preserve the current default threshold of three advisories for existing consumers, and configure Home to show `See all` from two advisories onward. This satisfies the Home contract without silently changing Destination behavior.

## Reuse

- Existing `OfficialAdvisoriesSection`, `openList` store action, heading layout, `See all` styling, and two-card slice.
- Exemplar: the existing `Recent updates` heading action in `src/screens/HomeScreen.tsx`, which uses the same `See all` wording for list discovery.

## Changes

1. `src/components/OfficialAdvisoriesSection.tsx`
   - Change: add an optional `seeAllMinimumCount` numeric prop with a default value of `3`; render the existing `See all` action when `visible.length >= seeAllMinimumCount`.
   - Preserve: two-card display limit, advisory ordering, empty/loading/error states, retry behavior, `openList` navigation, card selection, wording, styling, and the existing behavior of consumers that omit the prop.
   - Verify: the default component behavior still hides the action for zero, one, and two advisories and shows it from three onward.

2. `src/screens/HomeScreen.tsx`
   - Change: render `OfficialAdvisoriesSection` with `seeAllMinimumCount={2}`.
   - Preserve: the component's placement directly below `HomeMapPreview` and all surrounding Home content.
   - Verify: Home hides `See all` for zero or one advisory and shows it for exactly two and for larger collections.

3. `src/screens/DestinationScreen.tsx`
   - Change: no implementation change; retain the omitted prop so this consumer inherits the default threshold of three.
   - Preserve: destination filtering, destination-specific empty copy, and current `See all` visibility.
   - Verify: exactly two destination advisories do not gain a new action unintentionally, while three or more continue to show it.

## Scope

- Inherit: Home receives the new two-advisory threshold; any consumer omitting the prop retains the current three-advisory threshold.
- Verify: Home, Destination, and the `AdvisoryList` navigation reached through the shared `openList` action.
- Exclude: advisory fetching, filtering, sorting, severity presentation, empty-state copy, retry behavior, map advisory indicators, and notification preferences.

## Validation

- Product: on Home, inspect advisory collections containing zero, one, two, and three-or-more items; confirm `See all` appears only for two or more and opens the full advisory list.
- Interface: confirm the heading remains aligned with and without the action, only two cards remain visible in the compact Home section, and loading/error/empty states are unchanged.
- System: confirm the shared component remains the presentation owner, `openList` remains the navigation owner, and Destination retains its previous default threshold.
- Repository: `npm run typecheck` → TypeScript completes with no errors.

## Stop conditions

- Stop if the accepted Home requirement has changed, Home should display a different number of preview cards, the full-list destination changes, or Destination is intended to inherit the two-advisory threshold too.

## Design documentation

- After acceptance and validation: record the Home-specific `See all` threshold alongside the multiple-advisory rule in `SACHET-Integration-Plan.md`; do not change the document before the implementation is accepted.

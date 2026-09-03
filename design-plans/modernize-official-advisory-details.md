# Modernize the official advisory detail screen without changing official content

Written against: unavailable (the repository does not currently have a `HEAD` commit)

## Evidence chain

- Surface: `AdvisoryCard` → `View advisory` → `AdvisoryDetailsScreen`
- Problem: the list card now establishes a soft severity-tinted, fully outlined, elevated material, but the destination detail screen returns to a plain white hero with a thick top rule and a grid of independent white boxes. The abrupt visual change makes one advisory feel like two unrelated interfaces.
- Design evidence: `SACHET-Integration-Plan.md`, lines 187–196, requires severity, issued time, validity, affected area, description, instructions, authority, and explicit NDMA SACHET provenance while preserving official wording verbatim. The current `src/components/AdvisoryCard.tsx` is the accepted entry-surface exemplar for severity tint, border treatment, corner radius, depth, typography, and source presentation.
- Owner: `src/screens/AdvisoryDetailsScreen.tsx`
- Scope and affected surfaces: the populated and missing states of the `AdvisoryDetails` stack route; entry points from Home, Destination, and the complete advisory list all converge on this route.
- Uncertainty: the final vertical rhythm and text wrapping require manual confirmation on the iPhone simulator with both short and unusually long official messages.

## Design decision

Treat the detail screen as the expanded state of the advisory card. Use the same severity-derived tonal material for one prominent hero, consolidate metadata into one calm grouped facts surface, render official description and instructions as readable document sections, and finish with a subdued provenance panel. Preserve every official value and all verbatim text; change only hierarchy, grouping, and presentation.

## Reuse

- `advisorySeverityColor`, `advisorySeverityLabel`, and `formatAdvisoryTime` from `src/utils/advisory.ts`.
- Existing `FlowHeader`, `Meta`, and `OfficialText` ownership in `src/screens/AdvisoryDetailsScreen.tsx`.
- Exemplar: `src/components/AdvisoryCard.tsx`, specifically its `${color}0A` surface, `${color}24` outline, 20-point corner radius, severity-colored shadow, severity dot/label treatment, and `NDMA SACHET` source label.

## Changes

1. `src/screens/AdvisoryDetailsScreen.tsx` — hero
   - Change: replace the white top-bordered hero with a 20-point, full-outline, elevated hero using `backgroundColor: `${color}0A``, `borderColor: `${color}24``, and `shadowColor: color`; match the advisory card's elevation, shadow offset, opacity, and radius. Add a top status row containing a severity dot and uppercase severity label on the left and `NDMA SACHET` on the right. Keep the official headline prominent, with affected area directly beneath it.
   - Preserve: exact headline and area values, severity mapping, selection behavior, and the separate route header.
   - Verify: the detail view reads as the expanded version of the tapped card, with no thick colored top bar and no duplicated app branding.

2. `src/screens/AdvisoryDetailsScreen.tsx` — advisory facts
   - Change: place all six metadata values under one `Advisory facts` heading inside a single white 18-point grouped surface. Keep the existing two-column responsive wrap, but remove borders/backgrounds from individual `Meta` cells; use spacing and subtle internal separators to group the values. Retain uppercase secondary labels and improve value size/line height for scanning.
   - Preserve: Issued, Effective, Valid until, Urgency, Certainty, and Authority values, including `Not specified` fallbacks and existing time formatting.
   - Verify: all six fields remain present, long authority names wrap without clipping, and the screen no longer presents a wall of six competing mini-cards.

3. `src/screens/AdvisoryDetailsScreen.tsx` — official message sections
   - Change: give `Official description` and `Official instructions` clear section headings and 18-point reading surfaces with 15-point body text and approximately 23-point line height. Use a neutral white surface for the description. Preserve the existing warm instruction tint but give it a restrained full outline and matching corner radius rather than a visually unrelated card style.
   - Preserve: conditional rendering, selectable text, exact verbatim description, exact verbatim instructions, and their original order.
   - Verify: long government text is comfortable to read, remains selectable, and is not truncated, rewritten, summarized, or collapsed.

4. `src/screens/AdvisoryDetailsScreen.tsx` — provenance and missing state
   - Change: present provenance in a compact soft-green 16-point panel with `Official source` as the heading, the distribution/source identifier beneath it, and the existing reproduction note as tertiary copy. Restyle the unavailable-advisory message as a centered 18-point neutral state panel aligned to the same horizontal content width.
   - Preserve: `Distributed through NDMA SACHET`, the complete CAP identifier, the reproduction note, and the missing-state wording.
   - Verify: provenance remains explicit without competing visually with safety instructions, and the missing state looks intentional beneath `FlowHeader`.

5. `src/screens/AdvisoryDetailsScreen.tsx` — page rhythm
   - Change: keep the existing maximum content width and safe-area behavior, while setting a consistent 16-point section gap and preserving 18-point horizontal padding. Do not add floating controls, gradients, glass effects, imagery, or another navigation action.
   - Preserve: vertical scrolling, Android bottom-inset handling, background color, and route behavior.
   - Verify: the page has a clear hero → facts → description → instructions → provenance reading sequence on narrow and wide layouts.

## Scope

- Inherit: every entry point that opens `AdvisoryDetails`, including Home, Destination, and `AdvisoryListScreen`.
- Verify: severe, moderate, minor, information, and extreme advisories; missing optional values; no description; no instructions; long affected areas; long issuing authorities; and long CAP identifiers.
- Exclude: `AdvisoryCard`, advisory fetching/filtering/sorting, SACHET parsing, notification behavior, list-screen layout, navigation behavior, map indicators, and any rewriting of official content.

## Validation

- Product: open advisories of at least two severity levels from Home and `See all`; confirm the detail hero inherits the tapped advisory's severity character and every official field remains available.
- Interface: manually inspect the screen on the iPhone simulator with short and long alerts; check title wrapping, metadata wrapping, scroll completion, selectable official text, instruction emphasis, and back navigation.
- System: confirm color and material values reuse the current `AdvisoryCard` exemplar and no second severity mapping or shared card primitive is introduced.
- Repository: `npm run typecheck` → TypeScript completes without errors.

## Stop conditions

- Stop if the current advisory-card shell is rejected, official SACHET text must be transformed instead of reproduced verbatim, required metadata changes, or implementation requires a new visual-effects dependency.

## Design documentation

- After acceptance and validation: none; the governing content and provenance requirements are already recorded in `SACHET-Integration-Plan.md`, and this change applies the existing advisory visual language rather than introducing a new product rule.

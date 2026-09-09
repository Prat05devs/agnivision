import { Platform, type ViewStyle } from "react-native";

// iOS draws a soft, tintable shadow. Android's `elevation` renders a hard neutral
// grey drop shadow with no colour control, which is what flattens the card stack
// against the app's green surfaces. Android compensates with a lower elevation plus
// a hairline border so the card edge stays legible instead of relying on the shadow.
export type ElevationLevel = 1 | 2 | 3;

const ios: Record<ElevationLevel, ViewStyle> = {
  1: { shadowColor: "#1D3724", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.08, shadowRadius: 6 },
  2: { shadowColor: "#1D3724", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.1, shadowRadius: 10 },
  3: { shadowColor: "#1D3724", shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.12, shadowRadius: 16 },
};

const android: Record<ElevationLevel, ViewStyle> = {
  1: { borderColor: "rgba(29,55,36,0.07)", borderWidth: 1, elevation: 1 },
  2: { borderColor: "rgba(29,55,36,0.09)", borderWidth: 1, elevation: 2 },
  3: { borderColor: "rgba(29,55,36,0.11)", borderWidth: 1, elevation: 3 },
};

export function shadow(level: ElevationLevel): ViewStyle {
  return Platform.OS === "android" ? android[level] : ios[level];
}

// React Native maps `shadowColor` onto Android's outline spot/ambient shadow
// (BaseViewManager), so a saturated shadowColor cannot produce iOS's soft glow — it
// paints a wide halo around the card. Making it neutral only changed the halo's
// colour, because the halo is the elevation shadow itself: Android has no tinted,
// soft, spread-out shadow, and any elevation on these wide cards reads as a band
// framing the surface rather than lifting it.
//
// Android therefore drops elevation entirely and carries the severity in an opaque
// surface and border. Opaque matters twice over: an elevation shadow is visible
// *through* a translucent background, so a see-through card cannot be made clean
// while any elevation remains.
const PAGE_SURFACE = { r: 248, g: 249, b: 252 } as const; // #F8F9FC, the screen behind these cards

function blendOverPage(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const channel = (offset: number) => parseInt(value.slice(offset, offset + 2), 16);
  const mix = (fg: number, bg: number) => Math.round(fg * alpha + bg * (1 - alpha));
  const rgb = [
    mix(channel(0), PAGE_SURFACE.r),
    mix(channel(2), PAGE_SURFACE.g),
    mix(channel(4), PAGE_SURFACE.b),
  ];
  return `#${rgb.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

// This is the single source of truth for the severity card's surface: colour, border
// AND depth. Callers must not add their own elevation or shadow* props, so there is no
// override-ordering to get wrong and no way for one platform's depth model to leak
// into the other.
export function tintedCard(color: string): ViewStyle {
  if (Platform.OS === "android") {
    // Deliberately flat: an opaque tinted surface with a stronger tinted border. No
    // elevation and no shadow keys at all, so there is nothing left that can halo.
    return {
      backgroundColor: blendOverPage(color, 0.07),
      borderColor: blendOverPage(color, 0.3),
    };
  }
  // iOS keeps the original translucent surface and soft coloured glow.
  return {
    backgroundColor: `${color}0A`,
    borderColor: `${color}24`,
    shadowColor: color,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  };
}

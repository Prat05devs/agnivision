import { Platform, type TextStyle } from "react-native";

// iOS renders SF Pro, which ships true Heavy (800) and Black (900) faces, so the
// numeric weight alone produces the intended hierarchy. Android's stock Roboto has
// no 800/900 face: both collapse to Bold, and on OEM ROMs with a swapped system
// font they can fall back to regular, flattening the type scale entirely.
// Android therefore selects an explicit Inter face per weight instead.
export const interFontMap = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_900Black",
} as const;

export type FontWeightToken = keyof typeof interFontMap;

// Pairing an already-bold Inter face with a numeric weight makes Android synthesize
// extra bolding on top of it, so the weight is cleared when a family is supplied.
export function font(weight: FontWeightToken): TextStyle {
  if (Platform.OS !== "android") {
    return { fontWeight: weight };
  }
  return { fontFamily: interFontMap[weight], fontWeight: "normal" };
}

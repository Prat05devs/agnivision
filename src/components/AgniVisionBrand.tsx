import { Pressable, StyleSheet, Text, View } from "react-native";

import { AgnivisionLogo } from "./AgnivisionLogo";

type AgniVisionBrandProps = {
  compact?: boolean;
  inverse?: boolean;
  onPress?: () => void;
};

export function AgniVisionBrand({ compact = false, inverse = false, onPress }: AgniVisionBrandProps) {
  const content = (
    <View style={[styles.content, compact && styles.contentCompact]}>
      <AgnivisionLogo compact={compact} size={compact ? 34 : 42} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[styles.wordmark, compact && styles.wordmarkCompact, inverse && styles.wordmarkInverse]}
      >
        AgniVision.live
      </Text>
    </View>
  );

  if (!onPress) {
    return <View accessibilityLabel="AgniVision.live" style={styles.staticBrand}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint="Returns to the Home screen"
      accessibilityLabel="AgniVision.live, Home"
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: "flex-start", borderRadius: 12, justifyContent: "center", minHeight: 44 },
  staticBrand: { alignSelf: "flex-start" },
  content: { alignItems: "center", flexDirection: "row", gap: 10, minWidth: 0 },
  contentCompact: { gap: 8 },
  wordmark: { color: "#073B2A", flexShrink: 1, fontSize: 22, fontWeight: "900", letterSpacing: -0.55 },
  wordmarkCompact: { fontSize: 18, letterSpacing: -0.35 },
  wordmarkInverse: { color: "#FFFFFF" },
  pressed: { opacity: 0.65 },
});

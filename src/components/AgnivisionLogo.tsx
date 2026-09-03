import { Image, StyleSheet } from "react-native";

type AgnivisionLogoProps = {
  compact?: boolean;
  size?: number;
};

const agnivisionLogo = require("../../public/agnivision-logo.png");

export function AgnivisionLogo({ compact = false, size }: AgnivisionLogoProps) {
  const logoSize = size ?? (compact ? 38 : 46);

  return (
    <Image
      accessibilityLabel="AgniVision.live logo"
      resizeMode="contain"
      source={agnivisionLogo}
      style={[styles.logo, { height: logoSize, width: logoSize }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: { flexShrink: 0 },
});

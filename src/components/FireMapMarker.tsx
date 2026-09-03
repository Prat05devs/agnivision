import { Image, StyleSheet, View } from "react-native";

const markerImage = require("../../public/marker-map.png");

export function FireMapMarker({ selected = false, compact = false }: { selected?: boolean; compact?: boolean }) {
  const size = compact ? 32 : 42;
  const headSize = size * 0.48;

  return (
    <View style={[styles.container, { height: size, width: size, transform: [{ scale: selected ? 1.16 : 1 }] }]}>
      {selected ? <View style={[styles.selectionRing, { height: headSize, top: size * 0.08, width: headSize }]} /> : null}
      <Image fadeDuration={0} resizeMode="contain" source={markerImage} style={{ height: size, width: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  selectionRing: { backgroundColor: "rgba(255,67,48,0.22)", borderColor: "#FFFFFF", borderRadius: 999, borderWidth: 2, position: "absolute" },
});

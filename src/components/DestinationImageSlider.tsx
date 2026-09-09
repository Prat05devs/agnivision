import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, useWindowDimensions, View } from "react-native";

import destinationImageData from "../data/destinationImages.json";
import type { Destination } from "../types/destination";

type DestinationImage = {
  uri: string;
  title: string;
  license: string;
  sourcePage: string;
};

const destinationImages = destinationImageData as Record<string, DestinationImage[]>;

// Wikimedia rejects requests that carry a generic client User-Agent (Android's
// image loader sends "okhttp/..."), so every gallery fetch must identify the app.
// https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
const WIKIMEDIA_HEADERS = {
  "User-Agent": "AgniVision.live/1.0.0 (https://agnivision.live; contact@agnivision.live)",
};

export function DestinationImageSlider({ destination }: { destination: Destination }) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const width = Math.min(windowWidth - 40, 720);
  const height = Math.min(280, Math.max(190, width * 0.58));
  const images = (destinationImages[destination.id] ?? []).filter((image) => !failedImages.includes(image.uri));

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages([]);
  }, [destination.id]);

  if (images.length === 0) return null;

  return (
    <View accessibilityRole="image" accessibilityLabel={`Photo gallery for ${destination.name}`} style={[styles.gallery, { height, width }]}>
      <FlatList
        data={images}
        decelerationRate="fast"
        horizontal
        keyExtractor={(image) => image.uri}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        pagingEnabled
        renderItem={({ item, index }) => (
          <Image
            accessibilityLabel={`${destination.name} photo ${index + 1} of ${images.length}`}
            onError={() => setFailedImages((current) => current.includes(item.uri) ? current : [...current, item.uri])}
            resizeMode="cover"
            source={{ headers: WIKIMEDIA_HEADERS, uri: item.uri }}
            style={{ height, width }}
          />
        )}
        showsHorizontalScrollIndicator={false}
      />
      {images.length > 1 ? (
        <View pointerEvents="none" style={styles.pagination}>
          {images.map((image, index) => <View key={image.uri} style={[styles.dot, index === activeIndex && styles.dotActive]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { backgroundColor: "#DCE7DE", borderRadius: 22, overflow: "hidden", position: "relative" },
  pagination: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(12,31,19,0.62)", borderRadius: 12, bottom: 12, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 7, position: "absolute" },
  dot: { backgroundColor: "rgba(255,255,255,0.48)", borderRadius: 4, height: 6, width: 6 },
  dotActive: { backgroundColor: "#FFFFFF", width: 15 },
});

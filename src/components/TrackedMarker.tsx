import { useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { Marker, type MapMarkerProps } from "react-native-maps";

// Android rasterises a custom marker's children into a bitmap once and reuses it.
// With tracksViewChanges disabled from the very first render that snapshot is taken
// before the child image has decoded, so the marker is committed as blank and never
// repainted — which is why the detection pins were missing on Android but fine on
// iOS, where the child view is used directly.
//
// Tracking must therefore stay on briefly, then switch off: leaving it on permanently
// makes the map redraw every marker every frame, which is untenable with hundreds of
// detections on screen.
const ANDROID_SNAPSHOT_WINDOW_MS = 750;

export function TrackedMarker({ children, ...markerProps }: MapMarkerProps & { children?: ReactNode }) {
  const [tracksViewChanges, setTracksViewChanges] = useState(Platform.OS === "android");

  useEffect(() => {
    if (!tracksViewChanges) return;
    const timeout = setTimeout(() => setTracksViewChanges(false), ANDROID_SNAPSHOT_WINDOW_MS);
    return () => clearTimeout(timeout);
  }, [tracksViewChanges]);

  return (
    <Marker {...markerProps} tracksViewChanges={tracksViewChanges}>
      {children}
    </Marker>
  );
}

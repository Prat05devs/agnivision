import type { MapStyleElement } from "react-native-maps";

// A restrained basemap that keeps roads, terrain, water, and city labels readable
// while giving the AgniVision.live thermal density layer visual priority.
export const AGNIVISION_GOOGLE_MAP_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#EEF1ED" }, { saturation: -65 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#59635D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8FAF7" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#8C9B90" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#B6C1B8" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E8ECE7" }, { saturation: -55 }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#E0E6DF" }, { saturation: -60 }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DDE6DC" }, { saturation: -45 }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#D8DDD7" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#E7E9E4" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#D2E1E4" }, { saturation: -35 }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#667F86" }] },
];

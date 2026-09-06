import { Share } from "react-native";

import type { Coordinate } from "../types/fire";
import { getObservationLocationShareMessage } from "../utils/observationLocation";

export async function shareObservationLocation(coordinate: Coordinate, areaLabel: string) {
  const result = await Share.share({
    message: getObservationLocationShareMessage(coordinate, areaLabel),
    title: "Share AgniVision observation location",
  });

  return result.action !== Share.dismissedAction;
}

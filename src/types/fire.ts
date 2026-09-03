export type FireSensor =
  | "MODIS_NRT"
  | "VIIRS_NOAA20_NRT"
  | "VIIRS_NOAA21_NRT"
  | "VIIRS_SNPP_NRT";

export type ConfidenceClass = "low" | "nominal" | "high";
export type IntensityLevel = 1 | 2 | 3;
export type SensorFilter = "all" | "viirs" | "modis";
export type ConfidenceFilter = "all" | ConfidenceClass;

export type FireDetection = {
  id: string;
  source: "NASA_FIRMS";
  sensor: FireSensor;
  latitude: number;
  longitude: number;
  acquiredAtUtc: string;
  satellite: string;
  instrument: string;
  confidence: {
    raw: string | number;
    class?: ConfidenceClass;
  } | null;
  brightnessKelvin?: number;
  secondaryBrightnessKelvin?: number;
  scanKm?: number;
  trackKm?: number;
  frpMw?: number;
  intensityLevel: IntensityLevel;
  dayNight?: "D" | "N";
  version?: string;
  fetchedAtUtc: string;
};

export type FireDataResponse = {
  detections: FireDetection[];
  fetchedAtUtc: string;
  isStale?: boolean;
};

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type TimeWindow = "24h" | "3d" | "5d";

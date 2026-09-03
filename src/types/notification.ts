import type { Coordinate, ConfidenceClass } from "./fire";

export type NotificationCategory =
  | "proximity"
  | "destination"
  | "regional"
  | "digest"
  | "system"
  | "advisory";

export type NotificationSeverity = ConfidenceClass | "info" | "minor" | "moderate" | "severe" | "extreme";

export type MinimumNotificationSeverity = "all" | "nominal" | "high";
export type NotificationDelivery = "pushed" | "inbox-only";
export type NotificationPermissionState = "unknown" | "not-determined" | "granted" | "denied";
export type LocationPermissionLevel = "off" | "while-using" | "always";

export type QuietHoursPreference = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowHighOverride: boolean;
};

export type NotificationPreferences = {
  masterEnabled: boolean;
  proximityEnabled: boolean;
  proximityRadiusKm: 5 | 10 | 25 | 50;
  minimumSeverity: MinimumNotificationSeverity;
  regionalHotspotsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  systemStatusEnabled: boolean;
  officialAdvisoriesEnabled: boolean;
  minorAdvisoriesEnabled: boolean;
  quietHours: QuietHoursPreference;
};

export type WatchedDestination = {
  id: string;
  name: string;
  region: string;
  coordinate: Coordinate;
  radiusKm: 5 | 10 | 25 | 50;
  createdAtUtc: string;
};

export type NotificationTarget = {
  detectionId?: string;
  destinationId?: string;
  coordinate?: Coordinate;
  advisoryId?: string;
};

export type NotificationInboxEntry = {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  createdAtUtc: string;
  delivery: NotificationDelivery;
  readAtUtc: string | null;
  target: NotificationTarget;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  masterEnabled: false,
  proximityEnabled: true,
  proximityRadiusKm: 10,
  minimumSeverity: "nominal",
  regionalHotspotsEnabled: true,
  weeklyDigestEnabled: false,
  systemStatusEnabled: true,
  officialAdvisoriesEnabled: true,
  minorAdvisoriesEnabled: false,
  quietHours: {
    enabled: true,
    startHour: 22,
    endHour: 7,
    allowHighOverride: true,
  },
};

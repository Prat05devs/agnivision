export type AdvisorySeverity = "info" | "minor" | "moderate" | "severe" | "extreme";

export type OfficialAdvisory = {
  id: string;
  event: string;
  category: string;
  severity: AdvisorySeverity;
  urgency?: string;
  certainty?: string;
  headline: string;
  description?: string;
  instruction?: string;
  state?: string;
  district?: string;
  areaDescription?: string;
  issuedAt: string;
  effectiveAt?: string;
  expiresAt?: string;
  issuingAuthority?: string;
  latitude?: number;
  longitude?: number;
  source: "NDMA_SACHET";
  sourceIdentifier: string;
};

export type AdvisoryDataResponse = {
  advisories: OfficialAdvisory[];
  fetchedAtUtc: string;
  lastCheckedAtUtc: string;
  isStale?: boolean;
  isUnavailable?: boolean;
};

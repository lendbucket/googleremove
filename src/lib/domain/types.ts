export type ReviewSource = "manual" | "csv" | "google_business_profile";

export interface Review {
  id: string;
  source: ReviewSource;
  locationLabel: string;
  reviewerName: string;
  rating: number;
  text: string;
  postedAt: string | null;
  claimedVisitAt: string | null;
}

export interface BusinessProfile {
  name: string;
  rating: number;
  totalReviews: number;
  placeId?: string;
  locationLabel?: string;
}

export type RemovalProbabilityBand =
  | "very_high"
  | "high"
  | "moderate"
  | "low"
  | "very_low";

export interface AuditResult {
  reviewId: string;
  qualifies: boolean;
  strongestCategoryId: PolicyCategoryId | null;
  secondaryCategoryIds: PolicyCategoryId[];
  confidence: number;
  rationale: string;
  evidenceToGather: string[];
  removalProbabilityBand: RemovalProbabilityBand;
  removalProbabilityRange: string;
  strategySummary: string;
  steps: string[];
  topEvidenceToRaiseOdds: string;
}

export interface EvidenceItem {
  kind:
    | "no_pos_match"
    | "no_review_history"
    | "no_profile_photo"
    | "account_age"
    | "screenshot"
    | "other";
  detail: string;
}

export interface CaseFile {
  review: Review;
  audit: AuditResult;
  evidence: EvidenceItem[];
  reportText: string;
  appealText: string;
  publicResponse: string;
  status: CaseStatus;
}

export type CaseStatus =
  | "draft"
  | "submitted"
  | "decision_pending"
  | "removed"
  | "no_violation_found"
  | "appealed";

export type PolicyCategoryId =
  | "not_genuine_experience"
  | "conflict_of_interest"
  | "rating_manipulation"
  | "misleading_content"
  | "off_topic"
  | "impersonation"
  | "personal_information"
  | "harassment"
  | "profanity";

export interface ReviewImpact {
  reviewId: string;
  star: number;
  deltaIfRemoved: number;
  projectedRatingIfRemoved: number;
}

export interface AnalyticsSummary {
  currentRating: number;
  totalReviews: number;
  flaggedCount: number;
  projectedRatingAllFlaggedRemoved: number;
  netDelta: number;
  fiveStarsNeededFor45: number;
  fiveStarsNeededFor45AfterRemovals: number;
  fiveStarsNeededFor47: number;
  trustBand: string;
  distanceToNextBand: number;
  leverageOrder: string[];
}

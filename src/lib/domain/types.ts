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

export interface AuditResult {
  reviewId: string;
  qualifies: boolean;
  strongestCategoryId: PolicyCategoryId | null;
  secondaryCategoryIds: PolicyCategoryId[];
  confidence: number;
  rationale: string;
  evidenceToGather: string[];
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

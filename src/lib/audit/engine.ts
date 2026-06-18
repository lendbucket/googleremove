import Anthropic from "@anthropic-ai/sdk";
import type {
  Review,
  AuditResult,
  CaseFile,
  EvidenceItem,
  PolicyCategoryId,
  RemovalProbabilityBand,
} from "@/lib/domain/types";
import { POLICY_TAXONOMY } from "@/lib/policy/taxonomy";
import { REVIEWS_MANAGEMENT_TOOL_URL } from "@/lib/evidence/case-file";
import { buildAuditSystemPrompt, buildAuditUserPrompt } from "./prompt";

const MODEL = "claude-sonnet-4-6";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_CATEGORY_IDS = new Set<string>(Object.keys(POLICY_TAXONOMY));

const VALID_BANDS = new Set<string>([
  "very_high",
  "high",
  "moderate",
  "low",
  "very_low",
]);

function isValidCategoryId(id: unknown): id is PolicyCategoryId {
  return typeof id === "string" && VALID_CATEGORY_IDS.has(id);
}

function isValidBand(v: unknown): v is RemovalProbabilityBand {
  return typeof v === "string" && VALID_BANDS.has(v);
}

export async function auditReview(review: Review): Promise<AuditResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildAuditSystemPrompt(),
    messages: [{ role: "user", content: buildAuditUserPrompt(review) }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }

  const qualifies = parsed.qualifies === true;

  let strongestCategoryId: PolicyCategoryId | null = null;
  if (isValidCategoryId(parsed.strongestCategoryId)) {
    strongestCategoryId = parsed.strongestCategoryId;
  }

  const secondaryCategoryIds: PolicyCategoryId[] = [];
  if (Array.isArray(parsed.secondaryCategoryIds)) {
    for (const id of parsed.secondaryCategoryIds) {
      if (isValidCategoryId(id)) {
        secondaryCategoryIds.push(id);
      }
    }
  }

  let confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0;
  confidence = Math.max(0, Math.min(1, confidence));

  const rationale =
    typeof parsed.rationale === "string" ? parsed.rationale : "";

  const evidenceToGather: string[] = [];
  if (Array.isArray(parsed.evidenceToGather)) {
    for (const item of parsed.evidenceToGather) {
      if (typeof item === "string") {
        evidenceToGather.push(item);
      }
    }
  }

  const removalProbabilityBand: RemovalProbabilityBand = isValidBand(
    parsed.removalProbabilityBand
  )
    ? parsed.removalProbabilityBand
    : "very_low";

  const removalProbabilityRange =
    typeof parsed.removalProbabilityRange === "string"
      ? parsed.removalProbabilityRange
      : "";

  const strategySummary =
    typeof parsed.strategySummary === "string" ? parsed.strategySummary : "";

  const steps: string[] = [];
  if (Array.isArray(parsed.steps)) {
    for (const s of parsed.steps) {
      if (typeof s === "string") {
        steps.push(s);
      }
    }
  }

  const topEvidenceToRaiseOdds =
    typeof parsed.topEvidenceToRaiseOdds === "string"
      ? parsed.topEvidenceToRaiseOdds
      : "";

  return {
    reviewId: review.id,
    qualifies,
    strongestCategoryId,
    secondaryCategoryIds,
    confidence,
    rationale,
    evidenceToGather,
    removalProbabilityBand,
    removalProbabilityRange,
    strategySummary,
    steps,
    topEvidenceToRaiseOdds,
  };
}

export function buildCaseFile(
  review: Review,
  audit: AuditResult,
  evidence: EvidenceItem[] = []
): CaseFile {
  let reportText = "";
  let appealText = "";

  if (audit.strongestCategoryId) {
    const category = POLICY_TAXONOMY[audit.strongestCategoryId];
    reportText = category.reportTemplate(review, evidence);
    appealText = category.appealTemplate(review, evidence);

    // If the model returned no steps, compose a default sequence from the strongest category
    if (audit.steps.length === 0) {
      audit.steps = [
        `Open the Google Reviews Management Tool at ${REVIEWS_MANAGEMENT_TOOL_URL}`,
        `Find and select the review by ${review.reviewerName}`,
        `Choose the report reason: ${category.reportReasonHint}`,
        "Paste the report text from this case file into the report form",
        "Submit the report",
        "Wait 3 to 14 days for Google to review the report",
        "Check the review status in your Business Profile",
        "If denied, submit the one-time appeal using the appeal text and include the top evidence noted below",
        audit.topEvidenceToRaiseOdds
          ? `Top evidence to include: ${audit.topEvidenceToRaiseOdds}`
          : "Gather any additional evidence that supports the policy violation",
      ];
    }
  }

  const publicResponse =
    "Thank you for taking the time to leave feedback. We take all reviews seriously. " +
    "After reviewing our records, we were unable to find a matching visit or transaction. " +
    "If you believe this is an error, we invite you to contact us directly so we can look " +
    "into this further. This review has been reported to Google for assessment.";

  return {
    review,
    audit,
    evidence,
    reportText,
    appealText,
    publicResponse,
    status: "draft",
  };
}

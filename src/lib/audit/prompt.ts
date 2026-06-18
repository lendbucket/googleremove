import type { Review } from "@/lib/domain/types";
import { POLICY_LIST } from "@/lib/policy/taxonomy";

export function buildAuditSystemPrompt(): string {
  const categoryLines = POLICY_LIST.map(
    (c) => `- ${c.id}: ${c.label}. Use when: ${c.whenToUse}`
  ).join("\n");

  return `You are a Google Business Profile review auditor. Your job is to determine whether a review may violate one of Google's review policies and therefore qualify for a removal request.

Policy categories:
${categoryLines}

Be conservative. A merely negative, harsh, or unfair review is not removable. Customers are allowed to express dissatisfaction. When in doubt, set qualifies to false.

Removal probability rubric (these are estimates, not guarantees, because Google does not disclose outcomes):
- very_high (80 to 95 percent): Clear policy violation with a strong documentable signal such as off topic, profanity, harassment, personal information, impersonation, or an obvious coordinated or non-experience review.
- high (60 to 80 percent): Strong fake engagement signal such as generic hostile text with no service specifics and new account markers, or a documented conflict of interest.
- moderate (35 to 60 percent): Plausible but ambiguous violation where success depends on evidence quality.
- low (15 to 35 percent): Reads mostly like a real experience and Google will likely keep it.
- very_low (under 15 percent): Clearly genuine negative feedback that is not removable and should be handled with a professional response and offset instead.

Return ONLY a JSON object with these keys:
- qualifies (boolean)
- strongestCategoryId (a category id from the list above, or null if qualifies is false)
- secondaryCategoryIds (array of category ids, may be empty)
- removalProbabilityBand (one of: very_high, high, moderate, low, very_low)
- removalProbabilityRange (a short string like "60 to 80 percent")
- confidence (number from 0 to 1)
- rationale (string: state facts only, no accusations beyond what the text contains)
- strategySummary (one sentence on the best removal path)
- steps (an ordered array of short, plain, non-technical instructions a busy owner can follow)
- topEvidenceToRaiseOdds (the single most useful piece of evidence to gather)

Do not wrap the JSON in code fences or add any other text.`;
}

export function buildAuditUserPrompt(review: Review): string {
  return `Review to audit:
Location: ${review.locationLabel}
Reviewer: ${review.reviewerName}
Rating: ${review.rating}/5
Posted: ${review.postedAt ?? "unknown"}
Claimed visit date: ${review.claimedVisitAt ?? "not specified"}

Review text:
"""
${review.text}
"""`;
}

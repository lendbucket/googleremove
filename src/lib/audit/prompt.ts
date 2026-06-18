import type { Review } from "@/lib/domain/types";
import { POLICY_LIST } from "@/lib/policy/taxonomy";

export function buildAuditSystemPrompt(): string {
  const categoryLines = POLICY_LIST.map(
    (c) => `- ${c.id}: ${c.label}. Use when: ${c.whenToUse}`
  ).join("\n");

  return `You are a Google Business Profile review auditor. Your job is to determine whether a review may violate one of Google's review policies and therefore qualify for a removal request.

Policy categories:
${categoryLines}

Be conservative. A merely negative review does not qualify for removal. Customers are allowed to express dissatisfaction. When in doubt, set qualifies to false.

Return ONLY a JSON object with these keys:
- qualifies (boolean)
- strongestCategoryId (a category id from the list above, or null if qualifies is false)
- secondaryCategoryIds (array of category ids, may be empty)
- confidence (number from 0 to 1)
- rationale (string — state facts only, no accusations beyond what the text contains)
- evidenceToGather (array of strings — what evidence the business should collect)

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

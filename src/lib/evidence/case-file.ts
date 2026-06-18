import type { Review, EvidenceItem } from "@/lib/domain/types";

export const REVIEWS_MANAGEMENT_TOOL_URL =
  "https://support.google.com/business/workflow/9945796";

/**
 * Check Square POS for a matching customer transaction.
 * This is the highest-value evidence: match reviewer name and time window
 * against Square customers and payments.
 */
export async function checkSquareForMatch(
  _review: Review
): Promise<EvidenceItem | null> {
  return null;
}

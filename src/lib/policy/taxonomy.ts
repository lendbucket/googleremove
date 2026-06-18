import type { PolicyCategoryId, Review, EvidenceItem } from "../domain/types";

export interface PolicyCategory {
  id: PolicyCategoryId;
  label: string;
  googlePolicyName: string;
  reportReasonHint: string;
  exactLanguage: string;
  whenToUse: string;
  evidenceNeeded: string[];
  reportTemplate: (review: Review, evidence: EvidenceItem[]) => string;
  appealTemplate: (review: Review, evidence: EvidenceItem[]) => string;
}

function evidenceLines(evidence: EvidenceItem[]): string {
  if (evidence.length === 0) {
    return "[Attach evidence: no matching transaction in our records, account details, screenshots]";
  }
  return evidence.map((e) => `- ${e.detail}`).join("\n");
}

function visitClause(review: Review): string {
  return review.claimedVisitAt
    ? `on or around the claimed visit date of ${review.claimedVisitAt}`
    : "during the period this review references";
}

export const POLICY_TAXONOMY: Record<PolicyCategoryId, PolicyCategory> = {
  not_genuine_experience: {
    id: "not_genuine_experience",
    label: "Not a genuine experience (fake engagement)",
    googlePolicyName: "Fake engagement",
    reportReasonHint: "Off topic / fake (not a real experience)",
    exactLanguage:
      "Contributions to Google Maps should reflect a genuine experience at a place or business. Fake engagement is not allowed and will be removed. This includes content that is not based on a real experience or does not accurately represent the location or product in question.",
    whenToUse:
      "The reviewer was never a customer. This is the primary category for a non customer review.",
    evidenceNeeded: [
      "No transaction in point of sale or booking records matching the reviewer name, email, or phone",
      "Account created shortly before the review",
      "No other review history",
      "No profile photo",
    ],
    reportTemplate: (review, evidence) =>
      `This review does not reflect a genuine customer experience. Our booking and point of sale records show no transaction matching this reviewer ${visitClause(
        review
      )}. Under Google's policy, contributions should reflect a genuine experience and content that is not based on a real experience is not allowed.\n\nSupporting facts:\n${evidenceLines(
        evidence
      )}`,
    appealTemplate: (review, evidence) =>
      `We are appealing the decision to retain this review. We have documented that the author was never a customer of our business. Our records contain no transaction matching the reviewer ${visitClause(
        review
      )}, which places this review squarely within Google's fake engagement policy covering content not based on a real experience.\n\nDocumentation:\n${evidenceLines(
        evidence
      )}`,
  },

  conflict_of_interest: {
    id: "conflict_of_interest",
    label: "Conflict of interest",
    googlePolicyName: "Conflict of interest",
    reportReasonHint: "Conflict of interest",
    exactLanguage:
      "Content that is based on a conflict of interest is not allowed. A conflict of interest may include current or former employment, a contractual or consultory relationship, or other professional or personal affiliations that demonstrate a conflict of interest, such as industry competitors or familial relationships.",
    whenToUse:
      "The reviewer is a competitor, a former employee, or has a personal relationship or vendetta.",
    evidenceNeeded: [
      "Evidence the reviewer is a competitor or works for one",
      "Evidence of former employment or a contractual relationship",
      "Evidence of a personal relationship indicating bias",
    ],
    reportTemplate: (review, evidence) =>
      `This review is based on a conflict of interest. The author has an affiliation that biases the review rather than reflecting an independent customer experience. Google's policy prohibits content based on a conflict of interest, including industry competitors, former employment, or personal affiliations.\n\nSupporting facts:\n${evidenceLines(
        evidence
      )}`,
    appealTemplate: (review, evidence) =>
      `We are appealing the retention of this review on conflict of interest grounds. The author's affiliation is documented below and shows the review does not reflect an independent customer experience, which is the standard Google's policy protects.\n\nDocumentation:\n${evidenceLines(
        evidence
      )}`,
  },

  rating_manipulation: {
    id: "rating_manipulation",
    label: "Rating manipulation / coordinated",
    googlePolicyName: "Rating manipulation",
    reportReasonHint: "Spam / fake (coordinated)",
    exactLanguage:
      "Content exhibiting unusual volumes or patterns of review contributions that are indicative of efforts to manipulate a place's rating is not allowed, including content posted from multiple accounts by or at the request of one person.",
    whenToUse:
      "Several fake reviews cluster together or appear coordinated in timing, wording, or account pattern.",
    evidenceNeeded: [
      "Timestamps showing a cluster of reviews in a short window",
      "Repeated or near identical wording across reviews",
      "Multiple new accounts with no history",
    ],
    reportTemplate: (review, evidence) =>
      `This review is part of a pattern indicating rating manipulation. The timing, wording, and account characteristics across the affected reviews are consistent with a coordinated effort rather than independent customer experiences.\n\nSupporting facts:\n${evidenceLines(
        evidence
      )}`,
    appealTemplate: (review, evidence) =>
      `We are appealing on rating manipulation grounds. The documented pattern below shows an unusual volume and coordination consistent with Google's policy on manipulation, not genuine independent feedback.\n\nDocumentation:\n${evidenceLines(
        evidence
      )}`,
  },

  misleading_content: {
    id: "misleading_content",
    label: "Misleading / false factual claims",
    googlePolicyName: "Misleading content",
    reportReasonHint: "Not helpful / misleading",
    exactLanguage:
      "Google Maps does not allow individuals to mislead or deceive others or make misrepresentations, including false or misleading accounts of the description or quality of a good or service.",
    whenToUse:
      "The review states specific factual claims about a service or visit that did not happen and can be disproven.",
    evidenceNeeded: [
      "The specific false claim quoted from the review",
      "Records disproving it (no such service, no such appointment)",
    ],
    reportTemplate: (review, evidence) =>
      `This review makes specific factual claims that did not occur and that our records disprove. Google's policy prohibits false or misleading accounts of the quality of a good or service.\n\nSupporting facts:\n${evidenceLines(
        evidence
      )}`,
    appealTemplate: (review, evidence) =>
      `We are appealing the retention of this review. The factual claims it makes are contradicted by the records below, placing it within Google's prohibition on misleading content.\n\nDocumentation:\n${evidenceLines(
        evidence
      )}`,
  },

  off_topic: {
    id: "off_topic",
    label: "Off topic",
    googlePolicyName: "Off topic",
    reportReasonHint: "Off topic",
    exactLanguage:
      "Reviews must be about the actual business experience. Off topic comments, opinions, or unrelated content are not allowed and may be removed.",
    whenToUse: "The content is not about an experience at the business at all.",
    evidenceNeeded: ["Explanation of why the content is unrelated to the business"],
    reportTemplate: (review, _evidence) =>
      `This review is off topic. It does not describe an experience at our business and instead contains unrelated content, which Google's policy does not permit for reviews.`,
    appealTemplate: (review, _evidence) =>
      `We are appealing the retention of this review as off topic. It does not describe any experience at our business and falls outside what Google's review policy covers.`,
  },

  impersonation: {
    id: "impersonation",
    label: "Impersonation",
    googlePolicyName: "Impersonation",
    reportReasonHint: "Impersonation",
    exactLanguage:
      "Impersonating any person or entity, or misrepresenting an affiliation with any person or entity, is not allowed.",
    whenToUse: "The reviewer is posing as someone they are not.",
    evidenceNeeded: ["Evidence the account is impersonating a real person or entity"],
    reportTemplate: (review, evidence) =>
      `This review involves impersonation. The account misrepresents who it belongs to, which Google's policy prohibits.\n\nSupporting facts:\n${evidenceLines(
        evidence
      )}`,
    appealTemplate: (review, evidence) =>
      `We are appealing on impersonation grounds. The documentation below shows the account misrepresents its identity, contrary to Google's policy.\n\nDocumentation:\n${evidenceLines(
        evidence
      )}`,
  },

  personal_information: {
    id: "personal_information",
    label: "Personal information",
    googlePolicyName: "Personal information",
    reportReasonHint: "Personal information",
    exactLanguage:
      "Content that contains private or confidential information, such as names, phone numbers, or addresses of individuals, is not allowed.",
    whenToUse: "The review exposes a staff member's or another person's private details.",
    evidenceNeeded: ["The personal detail exposed, quoted from the review"],
    reportTemplate: (review, _evidence) =>
      `This review publishes personal information about an individual, which Google's policy does not allow in reviews. We request removal on that basis.`,
    appealTemplate: (review, _evidence) =>
      `We are appealing the retention of this review. It exposes personal information about an individual, which Google's policy prohibits.`,
  },

  harassment: {
    id: "harassment",
    label: "Harassment / threats",
    googlePolicyName: "Harassment",
    reportReasonHint: "Harassment",
    exactLanguage:
      "Content posted to harass other people or businesses, or that contains a specific threat of harm, is not allowed.",
    whenToUse: "The review targets a person with harassment or a threat.",
    evidenceNeeded: ["The harassing or threatening language quoted from the review"],
    reportTemplate: (review, _evidence) =>
      `This review contains harassment directed at our business or staff, which Google's policy prohibits. We request removal.`,
    appealTemplate: (review, _evidence) =>
      `We are appealing the retention of this review. Its content constitutes harassment under Google's policy.`,
  },

  profanity: {
    id: "profanity",
    label: "Obscenity / profanity",
    googlePolicyName: "Obscenity and profanity",
    reportReasonHint: "Profanity",
    exactLanguage:
      "Obscene and profane content used to offend or to emphasize criticism is not allowed.",
    whenToUse: "The review uses profanity or obscenity to offend.",
    evidenceNeeded: ["The profane content quoted from the review"],
    reportTemplate: (review, _evidence) =>
      `This review uses obscene or profane language to offend, which Google's policy does not permit. We request removal.`,
    appealTemplate: (review, _evidence) =>
      `We are appealing the retention of this review. Its use of obscene or profane language to offend violates Google's policy.`,
  },
};

export const POLICY_LIST: PolicyCategory[] = Object.values(POLICY_TAXONOMY);

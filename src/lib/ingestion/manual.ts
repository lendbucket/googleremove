import type { Review } from "@/lib/domain/types";

export interface ReviewSourceAdapter {
  name: string;
  load(input: unknown): Promise<Review[]>;
}

interface ManualReviewInput {
  reviewerName: string;
  rating: number;
  text: string;
  postedAt?: string;
  claimedVisitAt?: string;
}

interface ManualInput {
  locationLabel: string;
  reviews: ManualReviewInput[];
}

export const manualAdapter: ReviewSourceAdapter = {
  name: "manual",
  async load(input: unknown): Promise<Review[]> {
    const data = input as ManualInput;
    const timestamp = Date.now();
    return data.reviews.map((r, index) => ({
      id: `manual-${timestamp}-${index}`,
      source: "manual",
      locationLabel: data.locationLabel,
      reviewerName: r.reviewerName,
      rating: r.rating,
      text: r.text,
      postedAt: r.postedAt ?? null,
      claimedVisitAt: r.claimedVisitAt ?? null,
    }));
  },
};

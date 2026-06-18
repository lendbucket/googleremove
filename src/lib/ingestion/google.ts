import type { Review } from "@/lib/domain/types";
import type { ReviewSourceAdapter } from "./manual";

/**
 * Google Business Profile API integration.
 *
 * List reviews:
 *   GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
 *
 * The API supports: list, get, reply, delete-own-reply.
 * The API does NOT support: flag, report, or remove reviews.
 * Do not automate the Google UI.
 */
export const googleBusinessProfileAdapter: ReviewSourceAdapter = {
  name: "google_business_profile",
  async load(_input: unknown): Promise<Review[]> {
    throw new Error("not enabled yet");
  },
};

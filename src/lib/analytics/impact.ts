import type { ReviewImpact, AnalyticsSummary } from "@/lib/domain/types";

// estimateStarSum(rating, n) = rating * n
export function estimateStarSum(rating: number, n: number): number {
  return rating * n;
}

// displayRating(avg) = Math.round(avg * 10) / 10
export function displayRating(avg: number): number {
  return Math.round(avg * 10) / 10;
}

// starGlyph(avg) = Math.round(avg * 2) / 2
export function starGlyph(avg: number): number {
  return Math.round(avg * 2) / 2;
}

// singleRemovalDelta(rating, n, star) = (rating - star) / (n - 1)
export function singleRemovalDelta(
  rating: number,
  n: number,
  star: number
): number {
  if (n <= 1) return 0;
  return (rating - star) / (n - 1);
}

// projectedAverage(rating, n, removedStars[]) = (rating * n - sum(removedStars)) / (n - removedStars.length)
export function projectedAverage(
  rating: number,
  n: number,
  removedStars: number[]
): number {
  if (removedStars.length === 0) return rating;
  const remaining = n - removedStars.length;
  if (remaining <= 0) return 0;
  const sum = removedStars.reduce((a, b) => a + b, 0);
  return (rating * n - sum) / remaining;
}

// fiveStarsNeeded(avg, n, target): if avg >= target return 0;
// otherwise k = Math.ceil((target * n - avg * n) / (5 - target));
// return Math.max(0, k)
// Derivation: solve (avg*n + 5k)/(n+k) >= target
export function fiveStarsNeeded(
  avg: number,
  n: number,
  target: number
): number {
  if (avg >= target) return 0;
  if (target >= 5) return Infinity;
  const k = Math.ceil((target * n - avg * n) / (5 - target));
  return Math.max(0, k);
}

// fiveStarsNeededAfterRemovals(rating, n, removedStars[], target):
// let nr = n - removedStars.length;
// let avgr = projectedAverage(rating, n, removedStars);
// return fiveStarsNeeded(avgr, nr, target)
export function fiveStarsNeededAfterRemovals(
  rating: number,
  n: number,
  removedStars: number[],
  target: number
): number {
  const nr = n - removedStars.length;
  if (nr <= 0) return 0;
  const avgr = projectedAverage(rating, n, removedStars);
  return fiveStarsNeeded(avgr, nr, target);
}

// trustBand(avg): thresholds 4.7 excellent, 4.5 strong, 4.0 acceptable, below 4.0 at risk.
// Return { band, nextThreshold, distance } where distance is nextThreshold minus avg (0 if already excellent)
export function trustBand(avg: number): {
  band: string;
  nextThreshold: number;
  distance: number;
} {
  if (avg >= 4.7) return { band: "Excellent", nextThreshold: 4.7, distance: 0 };
  if (avg >= 4.5)
    return {
      band: "Strong",
      nextThreshold: 4.7,
      distance: displayRating(4.7 - avg),
    };
  if (avg >= 4.0)
    return {
      band: "Acceptable",
      nextThreshold: 4.5,
      distance: displayRating(4.5 - avg),
    };
  return {
    band: "At risk",
    nextThreshold: 4.0,
    distance: displayRating(4.0 - avg),
  };
}

// leverageRanking: return ids sorted by singleRemovalDelta descending (most positive lift first)
export function leverageRanking(
  reviews: { id: string; star: number }[],
  rating: number,
  n: number
): string[] {
  if (n <= 1 || reviews.length === 0) return reviews.map((r) => r.id);
  return [...reviews]
    .sort(
      (a, b) =>
        singleRemovalDelta(rating, n, a.star) -
        singleRemovalDelta(rating, n, b.star)
    )
    .reverse()
    .map((r) => r.id);
}

export function computeReviewImpact(
  reviewId: string,
  star: number,
  rating: number,
  n: number
): ReviewImpact {
  const delta = singleRemovalDelta(rating, n, star);
  const projected = n > 1 ? projectedAverage(rating, n, [star]) : rating;
  return {
    reviewId,
    star,
    deltaIfRemoved: displayRating(delta),
    projectedRatingIfRemoved: displayRating(projected),
  };
}

export function computeAnalyticsSummary(
  rating: number,
  totalReviews: number,
  flaggedReviews: { id: string; star: number }[]
): AnalyticsSummary {
  const removedStars = flaggedReviews.map((r) => r.star);
  const projected =
    removedStars.length > 0
      ? projectedAverage(rating, totalReviews, removedStars)
      : rating;
  const trust = trustBand(rating);
  const order = leverageRanking(flaggedReviews, rating, totalReviews);

  return {
    currentRating: rating,
    totalReviews,
    flaggedCount: flaggedReviews.length,
    projectedRatingAllFlaggedRemoved: displayRating(projected),
    netDelta: displayRating(projected - rating),
    fiveStarsNeededFor45: fiveStarsNeeded(rating, totalReviews, 4.5),
    fiveStarsNeededFor45AfterRemovals: fiveStarsNeededAfterRemovals(
      rating,
      totalReviews,
      removedStars,
      4.5
    ),
    fiveStarsNeededFor47: fiveStarsNeeded(rating, totalReviews, 4.7),
    trustBand: trust.band,
    distanceToNextBand: trust.distance,
    leverageOrder: order,
  };
}

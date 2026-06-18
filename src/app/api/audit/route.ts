export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { manualAdapter } from "@/lib/ingestion/manual";
import { auditReview, buildCaseFile } from "@/lib/audit/engine";
import {
  computeReviewImpact,
  computeAnalyticsSummary,
} from "@/lib/analytics/impact";
import type { CaseFile, ReviewImpact } from "@/lib/domain/types";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const profile = body.profile as {
      rating: number;
      totalReviews: number;
      locationLabel?: string;
    };
    const reviews = await manualAdapter.load({
      locationLabel: profile.locationLabel ?? "Unknown",
      reviews: body.reviews,
    });

    const caseFiles: CaseFile[] = [];
    for (const review of reviews) {
      const audit = await auditReview(review);
      const caseFile = buildCaseFile(review, audit);
      caseFiles.push(caseFile);
    }

    // Compute per-review impact for flagged reviews
    const flaggedReviews = caseFiles
      .filter((cf) => cf.audit.qualifies)
      .map((cf) => ({ id: cf.review.id, star: cf.review.rating }));

    const impacts: ReviewImpact[] = flaggedReviews.map((fr) =>
      computeReviewImpact(
        fr.id,
        fr.star,
        profile.rating,
        profile.totalReviews
      )
    );

    const analytics = computeAnalyticsSummary(
      profile.rating,
      profile.totalReviews,
      flaggedReviews
    );

    // Detect coordinated attack: 3+ reviews with tight date cluster,
    // high text similarity, or new account markers
    let coordinated = false;
    let coordinatedNote = "";

    if (flaggedReviews.length >= 3) {
      const flaggedCases = caseFiles.filter((cf) => cf.audit.qualifies);

      // Check for date clustering
      const dates = flaggedCases
        .map((cf) => cf.review.postedAt)
        .filter((d): d is string => d !== null)
        .map((d) => new Date(d).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);

      const hasDateCluster =
        dates.length >= 3 &&
        dates[dates.length - 1] - dates[0] < 7 * 24 * 60 * 60 * 1000;

      // Check for text similarity (simple: shared long substrings)
      const texts = flaggedCases.map((cf) =>
        cf.review.text.toLowerCase().trim()
      );
      let similarPairs = 0;
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const words1 = new Set(texts[i].split(/\s+/));
          const words2 = new Set(texts[j].split(/\s+/));
          const overlap = [...words1].filter((w) => words2.has(w)).length;
          const minSize = Math.min(words1.size, words2.size);
          if (minSize > 0 && overlap / minSize > 0.6) {
            similarPairs++;
          }
        }
      }
      const hasTextSimilarity = similarPairs >= 2;

      // Check for rating manipulation category
      const hasManipulationFlag = flaggedCases.some(
        (cf) =>
          cf.audit.strongestCategoryId === "rating_manipulation" ||
          cf.audit.secondaryCategoryIds.includes("rating_manipulation")
      );

      if (hasDateCluster || hasTextSimilarity || hasManipulationFlag) {
        coordinated = true;
        const reasons: string[] = [];
        if (hasDateCluster) reasons.push("reviews posted within a narrow window");
        if (hasTextSimilarity)
          reasons.push("high similarity in review language");
        if (hasManipulationFlag)
          reasons.push("rating manipulation signals detected");
        coordinatedNote = `Possible coordinated attack: ${reasons.join(", ")}. This pattern strengthens a rating manipulation report to Google.`;
      }
    }

    return NextResponse.json({
      caseFiles,
      impacts,
      analytics,
      coordinated,
      coordinatedNote,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

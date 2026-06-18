"use client";

import { useState } from "react";
import type {
  CaseFile,
  ReviewImpact,
  AnalyticsSummary,
  BusinessProfile,
} from "@/lib/domain/types";
import { POLICY_TAXONOMY } from "@/lib/policy/taxonomy";
import { REVIEWS_MANAGEMENT_TOOL_URL } from "@/lib/evidence/case-file";

// -- Future layers (stubs, not implemented) --
// TODO: Supabase persistence for a per-review status pipeline
//   (draft, submitted, decision_pending, removed, appealed) across both locations
// TODO: Competitor benchmarking using Places nearby search to compare
//   rating and count against local salons
// TODO: New low-review monitoring with Resend email alerts
// TODO: Full review sync through the Google Business Profile API after OAuth approval

interface ReviewEntry {
  reviewerName: string;
  rating: number;
  text: string;
  postedAt?: string;
  claimedVisitAt?: string;
}

interface AuditResponse {
  caseFiles: CaseFile[];
  impacts: ReviewImpact[];
  analytics: AnalyticsSummary;
  coordinated: boolean;
  coordinatedNote: string;
}

const BAND_COLORS: Record<string, { bg: string; fill: string; text: string }> =
  {
    very_high: {
      bg: "bg-red-50",
      fill: "bg-red-500",
      text: "text-red-700",
    },
    high: {
      bg: "bg-orange-50",
      fill: "bg-orange-500",
      text: "text-orange-700",
    },
    moderate: {
      bg: "bg-amber-50",
      fill: "bg-amber-500",
      text: "text-amber-700",
    },
    low: {
      bg: "bg-blue-50",
      fill: "bg-blue-400",
      text: "text-blue-700",
    },
    very_low: {
      bg: "bg-gray-50",
      fill: "bg-gray-400",
      text: "text-gray-600",
    },
  };

const BAND_LABELS: Record<string, string> = {
  very_high: "Very High",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  very_low: "Very Low",
};

const BAND_WIDTHS: Record<string, string> = {
  very_high: "87%",
  high: "70%",
  moderate: "47%",
  low: "25%",
  very_low: "10%",
};

function halfStarGlyph(avg: number): string {
  const rounded = Math.round(avg * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    "\u2605".repeat(full) +
    (half ? "\u00BD" : "") +
    "\u2606".repeat(empty)
  );
}

export default function Home() {
  // Step 1: Profile
  const [profileQuery, setProfileQuery] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [placesConfigured, setPlacesConfigured] = useState<boolean | null>(
    null
  );
  const [manualMode, setManualMode] = useState(false);
  const [manualRating, setManualRating] = useState("4.5");
  const [manualTotal, setManualTotal] = useState("100");
  const [manualName, setManualName] = useState("");
  const [locationLabel, setLocationLabel] = useState("Corpus Christi");

  // Step 2: Reviews
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [addName, setAddName] = useState("");
  const [addRating, setAddRating] = useState(1);
  const [addDate, setAddDate] = useState("");
  const [addText, setAddText] = useState("");
  const [bulkText, setBulkText] = useState("");

  // Step 3: Results
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function searchProfile() {
    setProfileLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: profileQuery }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (!data.configured) {
        setPlacesConfigured(false);
        setManualMode(true);
      } else {
        setPlacesConfigured(true);
        setProfile(data.profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setProfileLoading(false);
    }
  }

  function applyManualProfile() {
    const r = parseFloat(manualRating);
    const t = parseInt(manualTotal, 10);
    if (isNaN(r) || isNaN(t) || r < 1 || r > 5 || t < 1) return;
    setProfile({
      name: manualName || locationLabel,
      rating: r,
      totalReviews: t,
      locationLabel,
    });
  }

  function addReview() {
    if (!addName.trim() || !addText.trim()) return;
    setReviews((prev) => [
      ...prev,
      {
        reviewerName: addName.trim(),
        rating: addRating,
        text: addText.trim(),
        postedAt: addDate || undefined,
      },
    ]);
    setAddName("");
    setAddRating(1);
    setAddDate("");
    setAddText("");
  }

  function parseBulk() {
    if (!bulkText.trim()) return;
    const blocks = bulkText.split(/\n\s*\n/).filter((b) => b.trim());
    const parsed: ReviewEntry[] = blocks.map((block, idx) => ({
      reviewerName: `Reviewer ${reviews.length + idx + 1}`,
      rating: 1,
      text: block.trim(),
    }));
    setReviews((prev) => [...prev, ...parsed]);
    setBulkText("");
  }

  function removeReview(idx: number) {
    setReviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runAudit() {
    if (!profile || reviews.length === 0) return;
    setAuditLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            rating: profile.rating,
            totalReviews: profile.totalReviews,
            locationLabel: profile.locationLabel ?? locationLabel,
          },
          reviews: reviews.map((r) => ({
            reviewerName: r.reviewerName,
            rating: r.rating,
            text: r.text,
            postedAt: r.postedAt,
            claimedVisitAt: r.claimedVisitAt,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setAuditLoading(false);
    }
  }

  const currentTrust = profile
    ? computeTrustBand(profile.rating)
    : null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 print:max-w-none print:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">
        Review Audit Portal
      </h1>
      <p className="text-gray-500 mb-8">
        Analyze reviews against Google policy and plan removal strategy
      </p>

      {/* Step 1: Connect Profile */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          1. Connect your business profile
        </h2>

        {!profile && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            {!manualMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Google Business Profile link or business name"
                  value={profileQuery}
                  onChange={(e) => setProfileQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), searchProfile())
                  }
                />
                <button
                  onClick={searchProfile}
                  disabled={profileLoading || !profileQuery.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {profileLoading ? "Searching..." : "Search"}
                </button>
              </div>
            )}

            {placesConfigured === false && (
              <p className="text-sm text-gray-500">
                Google Places API is not configured. Enter your profile details
                manually below.
              </p>
            )}

            {(manualMode || placesConfigured === false) && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Your business name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option>Corpus Christi</option>
                    <option>San Antonio</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current average rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={manualRating}
                      onChange={(e) => setManualRating(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total review count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={manualTotal}
                      onChange={(e) => setManualTotal(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={applyManualProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Set profile
                </button>
              </div>
            )}

            {!manualMode && placesConfigured !== false && (
              <button
                onClick={() => setManualMode(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Enter details manually instead
              </button>
            )}
          </div>
        )}

        {profile && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {profile.name}
                </h3>
                {profile.locationLabel && (
                  <p className="text-sm text-gray-500">
                    {profile.locationLabel}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setProfile(null);
                  setResult(null);
                  setManualMode(false);
                  setPlacesConfigured(null);
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Change
              </button>
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <span className="text-4xl font-bold text-gray-900">
                {profile.rating}
              </span>
              <span className="text-2xl text-amber-500 tracking-wider">
                {halfStarGlyph(profile.rating)}
              </span>
              <span className="text-gray-500">
                {profile.totalReviews} reviews
              </span>
            </div>
            {currentTrust && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded ${
                    currentTrust.band === "Excellent"
                      ? "bg-green-100 text-green-700"
                      : currentTrust.band === "Strong"
                        ? "bg-blue-100 text-blue-700"
                        : currentTrust.band === "Acceptable"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                  }`}
                >
                  {currentTrust.band}
                </span>
                {currentTrust.distance > 0 && (
                  <span className="text-sm text-gray-500">
                    {currentTrust.distance} points to{" "}
                    {currentTrust.nextThreshold}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Add Reviews */}
      {profile && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            2. Add reviews to audit
          </h2>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Reviewer name
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Stars
                </label>
                <select
                  value={addRating}
                  onChange={(e) => setAddRating(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date (optional)
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Review text
                </label>
                <input
                  type="text"
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addReview())
                  }
                />
              </div>
              <div className="col-span-1 flex items-end">
                <button
                  onClick={addReview}
                  className="w-full bg-gray-800 text-white py-1.5 rounded-md text-sm font-medium hover:bg-gray-900"
                >
                  Add
                </button>
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-blue-600 hover:underline">
                Bulk paste multiple reviews
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={4}
                  placeholder="Paste reviews separated by blank lines. Each block becomes one review."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <button
                  onClick={parseBulk}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-200"
                >
                  Parse and add
                </button>
              </div>
            </details>

            {reviews.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                {reviews.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 py-2 px-3 bg-gray-50 rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{r.reviewerName}</span>
                        <span className="text-amber-500">
                          {"\u2605".repeat(r.rating)}
                          {"\u2606".repeat(5 - r.rating)}
                        </span>
                        {r.postedAt && (
                          <span className="text-gray-400">{r.postedAt}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {r.text}
                      </p>
                    </div>
                    <button
                      onClick={() => removeReview(i)}
                      className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 3: Run Audit */}
      {profile && reviews.length > 0 && (
        <section className="mb-8 print:hidden">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            3. Run audit
          </h2>
          <button
            onClick={runAudit}
            disabled={auditLoading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {auditLoading ? "Analyzing reviews..." : "Audit all reviews"}
          </button>
        </section>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div id="audit-results">
          {/* Analytics Panel */}
          <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Rating impact analysis
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatCard
                label="Current rating"
                value={String(result.analytics.currentRating)}
              />
              <StatCard
                label="If flagged removed"
                value={String(result.analytics.projectedRatingAllFlaggedRemoved)}
                delta={result.analytics.netDelta}
              />
              <StatCard
                label="Flagged reviews"
                value={`${result.analytics.flaggedCount} of ${reviews.length}`}
              />
              <StatCard
                label="Trust band"
                value={result.analytics.trustBand}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniStat
                label="5-star reviews to reach 4.5"
                now={result.analytics.fiveStarsNeededFor45}
                after={result.analytics.fiveStarsNeededFor45AfterRemovals}
              />
              <MiniStat
                label="5-star reviews to reach 4.7"
                now={result.analytics.fiveStarsNeededFor47}
              />
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Distance to next band
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {result.analytics.distanceToNextBand === 0
                    ? "Already there"
                    : `+${result.analytics.distanceToNextBand} pts`}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              At high review counts, individual removals move the average slowly.
              Fresh five-star volume is typically the larger lever for improving
              your displayed rating. Removals matter most for eliminating clear
              policy violations and protecting your profile from coordinated attacks.
            </p>
          </section>

          {/* Coordinated Attack Banner */}
          {result.coordinated && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
              <h3 className="text-base font-semibold text-red-800 mb-1">
                Coordinated attack detected
              </h3>
              <p className="text-sm text-red-700">
                {result.coordinatedNote}
              </p>
              <p className="text-sm text-red-600 mt-2">
                When reporting these reviews, mention the pattern across
                multiple reviews. Google gives additional weight to
                rating manipulation reports that document coordination.
              </p>
            </div>
          )}

          {/* Per-Review Cards */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Review audit results
              </h2>
              <button
                onClick={() => window.print()}
                className="text-sm text-gray-500 hover:text-gray-700 print:hidden"
              >
                Print case files
              </button>
            </div>

            {sortByLeverage(result.caseFiles, result.analytics.leverageOrder).map(
              (cf) => {
                const impact = result.impacts.find(
                  (imp) => imp.reviewId === cf.review.id
                );
                return (
                  <CaseFileCard
                    key={cf.review.id}
                    caseFile={cf}
                    impact={impact ?? null}
                  />
                );
              }
            )}
          </section>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
            font-size: 11pt;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          #audit-results > section,
          #audit-results > div {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

function computeTrustBand(avg: number) {
  if (avg >= 4.7)
    return { band: "Excellent", nextThreshold: 4.7, distance: 0 };
  if (avg >= 4.5)
    return {
      band: "Strong",
      nextThreshold: 4.7,
      distance: Math.round((4.7 - avg) * 10) / 10,
    };
  if (avg >= 4.0)
    return {
      band: "Acceptable",
      nextThreshold: 4.5,
      distance: Math.round((4.5 - avg) * 10) / 10,
    };
  return {
    band: "At risk",
    nextThreshold: 4.0,
    distance: Math.round((4.0 - avg) * 10) / 10,
  };
}

function sortByLeverage(
  caseFiles: CaseFile[],
  leverageOrder: string[]
): CaseFile[] {
  const orderMap = new Map(leverageOrder.map((id, i) => [id, i]));
  return [...caseFiles].sort((a, b) => {
    const aIdx = orderMap.get(a.review.id) ?? 999;
    const bIdx = orderMap.get(b.review.id) ?? 999;
    return aIdx - bIdx;
  });
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {delta !== undefined && delta !== 0 && (
        <p
          className={`text-sm font-medium ${delta > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta}
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  now,
  after,
}: {
  label: string;
  now: number;
  after?: number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold text-gray-900">
        {now === Infinity ? "N/A" : now}
      </p>
      {after !== undefined && after !== now && (
        <p className="text-sm text-green-600">
          {after === Infinity ? "N/A" : after} after removals
        </p>
      )}
    </div>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs text-blue-600 hover:underline print:hidden"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm whitespace-pre-wrap text-gray-700">
        {text}
      </pre>
    </div>
  );
}

function CaseFileCard({
  caseFile,
  impact,
}: {
  caseFile: CaseFile;
  impact: ReviewImpact | null;
}) {
  const { audit, review } = caseFile;
  const band = audit.removalProbabilityBand;
  const colors = BAND_COLORS[band] ?? BAND_COLORS.very_low;
  const category = audit.strongestCategoryId
    ? POLICY_TAXONOMY[audit.strongestCategoryId]
    : null;
  const showAction = ["very_high", "high", "moderate"].includes(band);

  return (
    <div className="border border-gray-200 rounded-lg p-5 mb-5 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">
              {review.reviewerName}
            </span>
            <span className="text-amber-500 text-sm">
              {"\u2605".repeat(review.rating)}
              {"\u2606".repeat(5 - review.rating)}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {review.locationLabel}
            {review.postedAt ? ` / ${review.postedAt}` : ""}
          </p>
        </div>
        {impact && (
          <div className="text-right">
            <p
              className={`text-lg font-bold ${impact.deltaIfRemoved > 0 ? "text-green-600" : "text-gray-500"}`}
            >
              {impact.deltaIfRemoved > 0 ? "+" : ""}
              {impact.deltaIfRemoved}
            </p>
            <p className="text-xs text-gray-500">rating lift if removed</p>
          </div>
        )}
      </div>

      {/* Probability Meter */}
      <div className={`rounded-lg p-3 mb-4 ${colors.bg}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-semibold ${colors.text}`}>
            {BAND_LABELS[band]} removal probability
          </span>
          <span className={`text-sm ${colors.text}`}>
            {audit.removalProbabilityRange}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${colors.fill}`}
            style={{ width: BAND_WIDTHS[band] }}
          />
        </div>
      </div>

      {/* Policy Category */}
      {category && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {category.label}
          </p>
          <blockquote className="border-l-4 border-gray-300 pl-3 text-sm text-gray-600 italic">
            {category.exactLanguage}
          </blockquote>
        </div>
      )}

      {/* Rationale */}
      {audit.rationale && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Rationale</p>
          <p className="text-sm text-gray-600">{audit.rationale}</p>
        </div>
      )}

      {/* Strategy */}
      {audit.strategySummary && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Strategy</p>
          <p className="text-sm text-gray-600">{audit.strategySummary}</p>
        </div>
      )}

      {/* Steps */}
      {audit.steps.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Steps to follow
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            {audit.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Top Evidence */}
      {audit.topEvidenceToRaiseOdds && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-3">
          <p className="text-sm font-medium text-blue-800 mb-0.5">
            Top evidence to raise your odds
          </p>
          <p className="text-sm text-blue-700">
            {audit.topEvidenceToRaiseOdds}
          </p>
        </div>
      )}

      {/* Copyable Blocks */}
      {caseFile.reportText && (
        <CopyBlock label="Report text" text={caseFile.reportText} />
      )}
      {caseFile.appealText && (
        <CopyBlock label="Appeal text" text={caseFile.appealText} />
      )}
      {caseFile.publicResponse && (
        <CopyBlock label="Public response" text={caseFile.publicResponse} />
      )}

      {/* Action Button */}
      {showAction && (
        <a
          href={REVIEWS_MANAGEMENT_TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 print:hidden"
        >
          Open Google Reviews Management Tool
        </a>
      )}
    </div>
  );
}

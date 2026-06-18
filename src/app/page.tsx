"use client";

import { useState } from "react";
import type { CaseFile } from "@/lib/domain/types";
import { POLICY_TAXONOMY } from "@/lib/policy/taxonomy";
import { REVIEWS_MANAGEMENT_TOOL_URL } from "@/lib/evidence/case-file";

export default function Home() {
  const [location, setLocation] = useState("Corpus Christi");
  const [rating, setRating] = useState(1);
  const [reviewerName, setReviewerName] = useState("");
  const [claimedVisitAt, setClaimedVisitAt] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCaseFiles([]);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLabel: location,
          reviews: [
            {
              reviewerName,
              rating,
              text,
              claimedVisitAt: claimedVisitAt || undefined,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCaseFiles(data.caseFiles);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Review Audit Portal</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option>Corpus Christi</option>
            <option>San Antonio</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Reviewer display name
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Claimed visit date (optional)
          </label>
          <input
            type="date"
            value={claimedVisitAt}
            onChange={(e) => setClaimedVisitAt(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Review text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Auditing..." : "Audit Review"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-6">
          {error}
        </div>
      )}

      {caseFiles.map((cf, i) => (
        <CaseFileCard key={i} caseFile={cf} />
      ))}
    </main>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-gray-50 border rounded p-3 text-sm whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}

function CaseFileCard({ caseFile }: { caseFile: CaseFile }) {
  const { audit } = caseFile;
  const category = audit.strongestCategoryId
    ? POLICY_TAXONOMY[audit.strongestCategoryId]
    : null;

  return (
    <div className="border rounded-lg p-5 mb-6 bg-white">
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`inline-block px-2 py-1 rounded text-sm font-medium ${
            audit.qualifies
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {audit.qualifies ? "May qualify for removal" : "Likely stays"}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(audit.confidence * 100)}% confidence
        </span>
      </div>

      {category && (
        <div className="mb-3">
          <p className="font-medium">{category.label}</p>
          <blockquote className="mt-1 border-l-4 border-gray-300 pl-3 text-sm text-gray-600 italic">
            {category.exactLanguage}
          </blockquote>
        </div>
      )}

      {audit.rationale && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Rationale</p>
          <p className="text-sm text-gray-700">{audit.rationale}</p>
        </div>
      )}

      {audit.evidenceToGather.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Evidence to gather</p>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {audit.evidenceToGather.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {caseFile.reportText && (
        <CopyBlock label="Report text" text={caseFile.reportText} />
      )}
      {caseFile.appealText && (
        <CopyBlock label="Appeal text" text={caseFile.appealText} />
      )}
      {caseFile.publicResponse && (
        <CopyBlock label="Public response" text={caseFile.publicResponse} />
      )}

      {audit.qualifies && (
        <a
          href={REVIEWS_MANAGEMENT_TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 text-sm font-medium"
        >
          Open Google Reviews Management Tool
        </a>
      )}
    </div>
  );
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { manualAdapter } from "@/lib/ingestion/manual";
import { auditReview, buildCaseFile } from "@/lib/audit/engine";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const reviews = await manualAdapter.load(body);

    const caseFiles = [];
    for (const review of reviews) {
      const audit = await auditReview(review);
      const caseFile = buildCaseFile(review, audit);
      caseFiles.push(caseFile);
    }

    return NextResponse.json({ caseFiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

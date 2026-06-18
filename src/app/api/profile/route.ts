export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchProfile } from "@/lib/places/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.query as string;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const result = await fetchProfile(query.trim());
    return NextResponse.json({
      configured: true,
      profile: result.profile,
      sampleReviews: result.sampleReviews,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PLACES_NOT_CONFIGURED") {
      return NextResponse.json({ configured: false });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

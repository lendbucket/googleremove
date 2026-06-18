import type { BusinessProfile } from "@/lib/domain/types";

// Places returns the average rating and total review count and at most 5 reviews;
// it does not return the per-star distribution or the full review list,
// and Places review text must not be persisted.

interface PlacesTextSearchResult {
  places?: {
    id?: string;
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
    reviews?: {
      authorAttribution?: { displayName?: string };
      rating?: number;
      text?: { text?: string };
    }[];
  }[];
}

interface PlaceDetailsResult {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: {
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string };
  }[];
}

export interface SampleReview {
  author: string;
  rating: number;
  text: string;
}

export async function fetchProfile(input: string): Promise<{
  profile: BusinessProfile;
  sampleReviews: SampleReview[];
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("PLACES_NOT_CONFIGURED");
  }

  // If input looks like a Google Maps URL, try to extract a place_id or text query
  let placeId: string | null = null;
  let textQuery = input;

  if (input.includes("google.com/maps") || input.includes("goo.gl/maps")) {
    const pidMatch = input.match(/place_id[=:]([A-Za-z0-9_-]+)/);
    if (pidMatch) {
      placeId = pidMatch[1];
    } else {
      // Try to extract the place name from the URL path
      const nameMatch = input.match(/\/place\/([^/@]+)/);
      if (nameMatch) {
        textQuery = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
      }
    }
  }

  let resolvedPlaceId = placeId;

  // If no place_id, use Text Search to find it
  if (!resolvedPlaceId) {
    const searchRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({ textQuery }),
      }
    );

    if (!searchRes.ok) {
      throw new Error(`Places search failed: ${searchRes.status}`);
    }

    const searchData: PlacesTextSearchResult = await searchRes.json();
    if (!searchData.places || searchData.places.length === 0) {
      throw new Error("No matching business found");
    }

    resolvedPlaceId = searchData.places[0].id ?? null;
  }

  if (!resolvedPlaceId) {
    throw new Error("Could not resolve place ID");
  }

  // Fetch Place Details with reviews
  const detailsRes = await fetch(
    `https://places.googleapis.com/v1/places/${resolvedPlaceId}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,rating,userRatingCount,reviews",
      },
    }
  );

  if (!detailsRes.ok) {
    throw new Error(`Place details failed: ${detailsRes.status}`);
  }

  const details: PlaceDetailsResult = await detailsRes.json();

  const profile: BusinessProfile = {
    name: details.displayName?.text ?? textQuery,
    rating: details.rating ?? 0,
    totalReviews: details.userRatingCount ?? 0,
    placeId: details.id ?? resolvedPlaceId,
  };

  const sampleReviews: SampleReview[] = (details.reviews ?? [])
    .slice(0, 5)
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? "Unknown",
      rating: r.rating ?? 0,
      text: r.text?.text ?? "",
    }));

  return { profile, sampleReviews };
}

import { get, post } from "./api";

// Reputation, from the record.
//
// Seller and buyer scores are separate because they are different claims —
// someone who pays promptly and someone who packs a card properly are not
// the same person twice.

export type Reputation = {
  count: number; average: number | null;
  asSeller: { count: number; average: number | null };
  asBuyer: { count: number; average: number | null };
  recent: {
    stars: number; comment: string | null; createdAt: string;
    raterRole: string; raterName: string | null;
  }[];
};

export type PendingDeal = {
  listing_id: string; card_name: string; set_name: string | null;
  grader: string | null; grade: string | null; image_url: string | null;
  photos: { angle: string; url: string }[] | null;
  sold_at: string | null; my_role: "seller" | "buyer";
};

export async function reputation(userId: string): Promise<Reputation | null> {
  try { return await get<Reputation>(`/ratings/${encodeURIComponent(userId)}`); }
  catch { return null; }
}

export async function pendingRatings(): Promise<PendingDeal[]> {
  try {
    const r = await get<{ deals: PendingDeal[] }>("/ratings/pending");
    return r.deals ?? [];
  } catch { return []; }
}

export const leaveRating = (listingId: string, stars: number, comment?: string) =>
  post<{ ratingId?: string; error?: string; message?: string }>(
    "/ratings", { listingId, stars, comment });

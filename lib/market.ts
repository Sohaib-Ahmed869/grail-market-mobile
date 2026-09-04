import { del, get, post } from "./api";

export type Listing = {
  listing_id: string; card_name: string; set_name: string | null;
  card_number: string | null; game: string | null; image_url: string | null;
  grader: string | null; grade: string | null; cert_number: string | null;
  variant: string | null; is_raw: boolean; condition_note: string | null;
  price: string | number; currency: string; market_value: string | number | null;
  strategy: string | null; delivery: string[]; suburb: string | null;
  status: string; reject_reason?: string | null;
  seller_id?: string;
  photos: { angle: string; url: string }[]; video_url: string | null;
  photo_verified: boolean; featured: boolean;
  views?: number; saves?: number;
  live_at: string | null; created_at: string;
};

export type Offer = {
  offer_id: string; listing_id: string; buyer_id: string; buyer_name?: string | null;
  amount: string | number; currency: string; note: string | null;
  status: string; created_at: string;
  card_name?: string; image_url?: string | null; asking?: string | number;
  grader?: string | null; grade?: string | null; set_name?: string | null;
};

export const num = (v: string | number | null | undefined) =>
  v == null ? null : typeof v === "number" ? v : Number(v);

// ---- market ----------------------------------------------------------------

export async function browse(q: {
  game?: string; grader?: string; graded?: boolean;
  set?: string; number?: string; variant?: string; grade?: string; q?: string;
  min?: number; max?: number; sort?: string; catalogId?: string;
} = {}): Promise<{ listings: Listing[]; sort: string }> {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v != null && v !== "") p.set(k, String(v));
  try {
    return await get(`/listings${p.toString() ? `?${p}` : ""}`);
  } catch {
    return { listings: [], sort: "featured" };
  }
}

export async function getListing(id: string): Promise<Listing | null> {
  try {
    const r = await get<{ listing?: Listing }>(`/listings/${id}`);
    return r.listing ?? null;
  } catch { return null; }
}

export async function myListings(): Promise<{
  listings: Listing[]; quota: { plan: string | null; limit: number | null; used: number };
}> {
  try {
    return await get("/listings/mine");
  } catch {
    return { listings: [], quota: { plan: null, limit: null, used: 0 } };
  }
}

// ---- selling ---------------------------------------------------------------

export type DraftIn = {
  catalogId?: string | null; cardName: string; setName?: string | null;
  cardNumber?: string | null; game?: string | null; imageUrl?: string | null;
  grader?: string | null; grade?: string | null; certNumber?: string | null;
  variant?: string | null; isRaw?: boolean; conditionNote?: string | null;
  price: number; marketValue?: number | null; strategy?: string | null;
  delivery?: string[]; suburb?: string | null;
};

export async function createDraft(d: DraftIn) {
  return post<{ listingId?: string; angles?: string[]; error?: string; message?: string }>(
    "/listings", d,
  );
}

/** Upload one photograph straight to S3.
 *
 *  The bytes never pass through our API — it only signs the URL. Ten images
 *  and a video would otherwise occupy a request slot each on the box that also
 *  runs the scan pipeline. */
export async function uploadPhoto(uploadUrl: string, uri: string): Promise<boolean> {
  try {
    const blob = await (await fetch(uri)).blob();
    const r = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    return r.ok;
  } catch { return false; }
}

export async function photoUrls(listingId: string, angles: string[]) {
  return post<{ uploads?: { angle: string; uploadUrl: string; publicUrl: string }[]; error?: string }>(
    `/listings/${listingId}/photo-urls`, { angles },
  );
}

export async function savePhotos(
  listingId: string, photos: { angle: string; url: string }[], videoUrl?: string | null,
) {
  return post<{ photoVerified?: boolean; count?: number; error?: string }>(
    `/listings/${listingId}/photos`, { photos, videoUrl: videoUrl ?? null },
  );
}

export async function submitListing(listingId: string) {
  return post<{ status?: string; error?: string; message?: string }>(
    `/listings/${listingId}/submit`, { declared: true },
  );
}

export async function withdrawListing(listingId: string) {
  return post(`/listings/${listingId}/withdraw`, {});
}

/** Change a listing that is already up. Price, note, delivery, suburb only. */
export const editListing = (listingId: string, patch: {
  price?: number; conditionNote?: string; delivery?: string[]; suburb?: string;
}) => post<{ ok?: boolean; priceChanged?: boolean; error?: string }>(
  `/listings/${listingId}/edit`, patch);

export async function markSold(listingId: string, price?: number) {
  return post(`/listings/${listingId}/sold`, { price });
}

// ---- offers ----------------------------------------------------------------

export async function makeOffer(listingId: string, amount: number, note?: string) {
  return post<{ offerId?: string; error?: string; message?: string }>(
    `/listings/${listingId}/offers`, { amount, note },
  );
}

export type OffersOnListing = {
  offers: Offer[]; marketValue: number | null; asking: number;
  cardName?: string; setName?: string | null;
  grader?: string | null; grade?: string | null; imageUrl?: string | null;
};

export async function offersFor(listingId: string): Promise<OffersOnListing> {
  try {
    return await get<OffersOnListing>(`/listings/${listingId}/offers`);
  } catch { return { offers: [], marketValue: null, asking: 0 }; }
}

/** Every offer this member has made, across all listings. */
export async function myOffers(): Promise<{ offers: Offer[] }> {
  try {
    return await get("/listings/offers/mine");
  } catch { return { offers: [] }; }
}

export async function settleOffer(
  offerId: string, action: "accepted" | "declined" | "countered", amount?: number,
) {
  return post(`/listings/offers/${offerId}/settle`, { action, amount });
}

// ---- sellers ---------------------------------------------------------------

export type Seller = {
  sellerId: string; name: string; memberSince: string;
  verified: boolean; verifiedAt: string | null;
  live: number; sold: number; firstListed: string | null;
  suburbs: string[]; listings: Listing[];
};

/** The person behind a listing. Public, and deliberately thin: a name, a
 *  history and their other cards — never contact details. */
export async function sellerProfile(sellerId: string): Promise<Seller | null> {
  try {
    const r = await get<Seller & { error?: string }>(`/sellers/${encodeURIComponent(sellerId)}`);
    return r?.error ? null : r;
  } catch { return null; }
}

// ---- collection ------------------------------------------------------------

export type Entry = {
  entryId: string; catalogId: string | null; cardName: string;
  setName: string | null; cardNumber: string | null; imageUrl: string | null;
  grader: string | null; grade: string | null; variant: string | null;
  quantity: number;
  paid: number | null; value: number | null; addedAt: string;
};

export async function getCollection(): Promise<{
  entries: Entry[]; value: number; cost: number; gain: number; priced: number;
}> {
  try {
    return await get("/collection");
  } catch {
    return { entries: [], value: 0, cost: 0, gain: 0, priced: 0 };
  }
}

/** Take a card out. Destructive and not undoable, so the screen confirms
 *  first — this only reports what the server did with it. */
export async function removeFromCollection(entryId: string) {
  return del<{ ok?: boolean; error?: string; message?: string }>(
    `/collection/${encodeURIComponent(entryId)}`,
  );
}

export async function addToCollection(e: {
  catalogId?: string | null; cardName: string; setName?: string | null;
  cardNumber?: string | null; imageUrl?: string | null;
  grader?: string | null; grade?: string | null; variant?: string | null;
  quantity?: number; paid?: number | null;
}) {
  return post<{ entryId?: string; error?: string; message?: string }>("/collection", e);
}

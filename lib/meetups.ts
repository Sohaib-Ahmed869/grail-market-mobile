import { get } from "./api";

export type MeetupShop = {
  name: string; kind: "card" | "games"; lat: number; lon: number;
  address: string | null; website: string | null; openingHours: string | null;
  fromSellerKm: number | null; fromBuyerKm: number | null; mapsUrl: string;
};

export type MeetupAnswer = {
  shops: MeetupShop[]; sellerSuburb?: string | null; note: string | null; attribution?: string;
  /** The shops for this part of the country are still being fetched; asking
   *  again shortly will find them. */
  retry?: boolean;
};

/** Card shops between the two people on a deal. `near` is the buyer's own
 *  suburb or postcode; the server uses it to find a point and keeps nothing. */
export async function meetupShops(dealId: string, near?: string | null): Promise<MeetupAnswer | null> {
  try {
    const q = new URLSearchParams({ deal: dealId });
    if (near?.trim()) q.set("near", near.trim());
    const r = await get<MeetupAnswer & { error?: string }>(`/meetups/shops?${q}`);
    return r.error ? null : r;
  } catch {
    return null;
  }
}

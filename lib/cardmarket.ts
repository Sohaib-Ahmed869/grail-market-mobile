import { get } from "./api";
import type { Listing } from "./market";

// The market around one card: what it last sold for, what it is being asked
// for right now, and what is available here.
//
// None of this rides on the scan response. A scan already waits on vision and
// pricing, and the asking market is worth a second or two of its own rather
// than another second added to the number people are watching for.

export type LiveListing = {
  title: string; price: number; currency: string; condition: string | null;
  imageUrl: string | null; url: string; seller: string | null;
  sellerFeedbackPct: number | null; sellerFeedbackCount: number | null;
  bestOffer: boolean; grader: string | null; grade: number | null;
  ageDays: number | null;
};

export type LiveAsks = {
  listings: LiveListing[];
  total: number; matched: number; trimmed: number;
  medianAsk: number | null; askLow: number | null; askHigh: number | null;
  filteredToGrade: boolean; filteredToGrader: boolean;
  staleCeilingDays: number | null; cappedByStale: boolean;
};

const q = (params: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, String(v));
  }
  return p.toString();
};

/** Live asking prices, from the eBay adapter. */
export async function liveAsks(a: {
  name: string; setName?: string | null; number?: string | null;
  grader?: string | null; grade?: string | null; game?: string | null;
  printing?: string | null;
}): Promise<LiveAsks | null> {
  try {
    return await get<LiveAsks>(`/market/listings?${q({
      name: a.name, set: a.setName, number: a.number,
      grader: a.grader, grade: a.grade, game: a.game, printing: a.printing,
    })}`);
  } catch { return null; }
}

export type Sale = {
  sale_id: string; price: number | string; currency: string;
  sold_at: string; source: string; source_url: string | null; raw_title: string | null;
  // The key a sale is filed under. A price without the company and grade it
  // belongs to is not a comparable — it is a number.
  grader: string | null; grade: string | null;
};

export type SalesAnswer = {
  sales: Sale[]; itemised: number; known: number | null;
  lastSaleAt: string | null; note: string | null;
};

/** Confirmed sales we can actually itemise.
 *
 *  Returns null when the endpoint is not there — an older API build has no
 *  sales ledger, and "we cannot show these yet" is a different thing from
 *  "this card has never sold". The screen says which. */
export async function confirmedSales(a: {
  cardId: string; grader?: string | null; grade?: string | null;
  name?: string; setName?: string | null; number?: string | null;
}): Promise<SalesAnswer | null> {
  try {
    const r = await get<SalesAnswer & { error?: string }>(`/market/sales?${q({
      cardId: a.cardId, grader: a.grader, grade: a.grade,
      name: a.name, set: a.setName, number: a.number,
    })}`);
    return r?.error ? null : r;
  } catch { return null; }
}

/** Copies of this card for sale here, right now. */
export async function availableNow(catalogId: string): Promise<Listing[]> {
  try {
    const r = await get<{ listings: Listing[] }>(`/listings?${q({ catalogId })}`);
    return r.listings ?? [];
  } catch { return []; }
}

// ---- browsing by set --------------------------------------------------------

export type SetSummary = {
  setId: string; name: string; logo: string | null; symbol: string | null;
  total: number; official: number; releasedAt: string | null;
};

export type SetDetail = SetSummary & {
  cards: { cardId: string; name: string; localId: string; imageUrl: string | null }[];
};

export async function allSets(): Promise<SetSummary[]> {
  try {
    const r = await get<{ sets: SetSummary[] }>("/market/sets");
    return r.sets ?? [];
  } catch { return []; }
}

export async function setDetail(setId: string): Promise<SetDetail | null> {
  try {
    const r = await get<SetDetail & { error?: string }>(`/market/sets/${encodeURIComponent(setId)}`);
    return r?.error ? null : r;
  } catch { return null; }
}

// ---- one card's price, outside a scan ---------------------------------------

export type CardPrice = {
  name: string; setName: string | null; number: string | null;
  grader: string | null; grade: number | null;
  rawUsd: number | null;
  byGrader: Record<string, Record<string, {
    price: number; count?: number; confidence?: string; low?: number; high?: number;
    median?: number; asOf?: string;
  }>> | null;
  sold: { price: number; count?: number; confidence?: string } | null;
  slabPrice: { price: number; basis: string; confidence: string; sampleSize?: number;
               explain?: string; method?: string } | null;
  liveAsk: { median: number; low: number | null; high: number | null; count: number } | null;
};

/** The same chain a scan uses, for a card picked from a set or a search.
 *
 *  Deliberately the same endpoint: a scan and a browse that land on the same
 *  card must not quote two different figures for it. */
export async function cardPrice(a: {
  cardId?: string | null; name: string; setName?: string | null; number?: string | null;
  grader?: string | null; grade?: string | null; game?: string | null;
}): Promise<CardPrice | null> {
  try {
    return await get<CardPrice>(`/market/price?${q({
      cardId: a.cardId, name: a.name, set: a.setName, number: a.number,
      grader: a.grader, grade: a.grade, game: a.game,
    })}`);
  } catch { return null; }
}

// ---- market pulse -----------------------------------------------------------

export type Pulse = {
  label: string; setName: string | null; game: string | null;
  price: number; change24h: number | null; change7d: number | null;
  low7: number | null; high7: number | null; spark: number[];
  imageUrl?: string | null; cardId?: string | null;
};

/** What has actually moved, with the week's shape attached.
 *
 *  Replaces three hardcoded "market movers" that were invented. A placeholder
 *  is fine in a mockup and a lie in a product, and that one sat directly under
 *  a real collection value where it read as equally real. */
export async function marketPulse(): Promise<Pulse[]> {
  try {
    const r = await get<Pulse[]>("/market/pulse");
    // Sorted here, not left to whatever order the store returned. Every
    // screen showing these calls the section "biggest price moves" and then
    // takes the first few — an unsorted list made that a promise the UI
    // broke, with a 0.4% drift leading a week that contained an 18% fall.
    //
    // By SIZE, so a fall ranks with a rise of the same magnitude. Ranking by
    // the signed number would put every drop at the bottom, and a drop is
    // the one people most want to see.
    if (Array.isArray(r)) {
      return [...r].sort(
        (a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0),
      );
    }
    return [];
  } catch { return []; }
}

import { get } from "./api";
import { artFor, isLoadable } from "./art";
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

/** Every printing of one collector number, and whether they disagree enough
 *  that a single figure would be a lie. The scan result and the card page both
 *  read this, so the two cannot answer differently about the same card. */
export async function cardPrintings(a: {
  catalogId?: string | null; number?: string | null;
  setName?: string | null; game?: string | null;
}): Promise<{ variants: Variant[]; ambiguous: boolean }> {
  const empty = { variants: [], ambiguous: false };
  if (!a.number) return empty;
  try {
    const r = await get<{ variants?: Variant[]; ambiguous?: boolean }>(
      `/market/printings?${q({
        cardId: a.catalogId, number: a.number, set: a.setName, game: a.game,
      })}`,
    );
    return { variants: r?.variants ?? [], ambiguous: Boolean(r?.ambiguous) };
  } catch { return empty; }
}

/** Which of these printings is the one a scan says it saw.
 *
 *  The identifier already reads the variant off the card — it returned
 *  "Monkey.D.Luffy (Red Super Alternate Art)" for the card that priced at
 *  A$197 — so on a scan there is usually no question to ask. Matched on the
 *  variant words appearing in the scanned name, longest first, because "Super
 *  Alternate Art" is a substring of "Red Super Alternate Art" and matching
 *  the shorter one would pick a printing two thousand dollars away. */
/** What the scanner decided this printing is, if it decided.
 *
 *  The vision service ranks the candidate printings by picture and now sends
 *  that decision with the scan. Reading it beats re-deriving the printing from
 *  the card's NAME, which is what this file did before and which only worked
 *  when the catalogue happened to spell the variant into the title — and never
 *  worked on a low-confidence result, because the name that arrives then is
 *  the base card's.
 *
 *  A `fallback` is not a decision and is deliberately not honoured here: it
 *  means the pictures did not settle it, and the honest response to that is
 *  the question, not the cheapest printing. */
export type ScanPrintingChoice = {
  method?: string | null;
  margin?: number | null;
  label?: string | null;
  ranked?: { label: string; imageUrl?: string | null; score?: number | null }[];
};

export function printingFromChoice(
  choice: ScanPrintingChoice | null | undefined,
  variants: Variant[],
): Variant | null {
  if (!choice || (choice.method !== "visual" && choice.method !== "single")) return null;
  const label = (choice.label ?? "").toLowerCase();
  if (!label) return null;
  // Same longest-first rule as below: "Super Alternate Art" is a substring of
  // "Red Super Alternate Art", and matching the shorter one picks a printing
  // two thousand dollars away.
  const named = variants
    .filter((v) => v.variant)
    .sort((a, b) => b.variant!.length - a.variant!.length);
  for (const v of named) if (label.includes(v.variant!.toLowerCase())) return v;
  // The decided printing carries no variant word, which on a multi-printing
  // card means the base print.
  const base = variants.find((v) => !v.variant);
  return named.length > 0 && base ? base : null;
}

export function printingFromName(name: string, variants: Variant[]): Variant | null {
  const n = name.toLowerCase();
  const named = variants
    .filter((v) => v.variant)
    .sort((a, b) => (b.variant!.length - a.variant!.length));
  // An explicit variant name in the scanned title is the only positive
  // identification there is. Longest first, so "Red Super Alternate Art"
  // cannot be swallowed by "Super Alternate Art".
  for (const v of named) if (n.includes(v.variant!.toLowerCase())) return v;

  // Nothing matched. If this number has exactly one printing then there is
  // no question to ask and that printing is the card.
  if (variants.length === 1) return variants[0]!;

  // Otherwise: ASK.
  //
  // This used to fall back to the base printing, on the reasoning that a name
  // with no variant words in it must be the plain card. That reasoning picks
  // the CHEAPEST of five whenever the identifier does not spell the variant
  // out — which is the original defect wearing a new hat: a Red Super
  // Alternate Art silently priced as the A$18 base. A guess that lands on the
  // cheapest option is not a default, it is a wrong answer with a bias.
  return null;
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
  /** What the sales we cannot itemise add up to.
   *
   *  The provider reports totals rather than rows, so `sales` is often empty
   *  while `known` is nine. Saying "no sale on record" in that case
   *  contradicts the valuation directly above it, which was computed FROM
   *  those nine. This is what lets the panel show the evidence instead of
   *  denying it exists. */
  aggregate?: {
    price: number | null; median: number | null; low: number | null;
    high: number | null; confidence: string | null; asOf: string | null;
  } | null;
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
  cards: {
    cardId: string; name: string; localId: string; imageUrl: string | null;
    /** Ungraded price in US dollars, or null where nobody has one. Null is
     *  shown as a dash, never as zero — a set page printing A$0 under every
     *  unpriced card would be calling them worthless. */
    rawUsd: number | null;
    rarity: string | null;
  }[];
};

export type BrowseGame = { id: string; name: string; sets?: number; preview?: string | null };

/** The games we can browse. Cheap — the server answers from whatever it has
 *  already cached rather than asking four catalogues to draw four tiles. */
export async function browseGames(): Promise<BrowseGame[]> {
  try {
    const r = await get<{ games: BrowseGame[] }>("/market/games");
    return r.games ?? [];
  } catch { return []; }
}

/** Sets, for one game or — with no game — the Pokemon list this always was. */
export async function allSets(game?: string): Promise<SetSummary[]> {
  try {
    const r = await get<{ sets: SetSummary[] }>(
      `/market/sets${game ? `?game=${encodeURIComponent(game)}` : ""}`,
    );
    return r.sets ?? [];
  } catch { return []; }
}

export type CardMeta = {
  cardId: string; name: string; setName: string | null;
  number: string | null; game: string | null; imageUrl: string | null;
};

/** Who a catalogue id is, asked rather than worked out.
 *
 *  This screen used to derive the card's set by cutting the id at its last
 *  hyphen and reading that set. Correct for Pokemon — `swsh7-215` gives
 *  `swsh7` — and correct for nothing else. A One Piece id is
 *  `optcg-OP13-119`, so the cut produced `optcg-OP13` while the set endpoint
 *  wants `optcg:OP13`; the read missed, the page had no card name, and with
 *  no name there is no price either. Portgas D Ace sits first on the board,
 *  so it was the first thing anyone tapped.
 *
 *  The server answers from what it already stores, which also covers Magic,
 *  where the set is not in the id at all and no cut could have found it. */
export async function cardMeta(cardId: string, setId?: string | null): Promise<CardMeta | null> {
  try {
    const r = await get<CardMeta & { error?: string }>(
      `/market/card?catalogId=${encodeURIComponent(cardId)}` +
        // Told, not derived. Only Pokemon and One Piece card ids contain their
        // set; the other seven catalogues use an opaque provider id, so a page
        // that had to work the set out from the id said "Card Not Found" on
        // every card in every one of them. The screen that opened this knew
        // the set all along.
        (setId ? `&setId=${encodeURIComponent(setId)}` : ""),
    );
    return r?.error || !r?.name ? null : r;
  } catch { return null; }
}

export async function setDetail(setId: string): Promise<SetDetail | null> {
  try {
    const r = await get<SetDetail & { error?: string }>(`/market/sets/${encodeURIComponent(setId)}`);
    if (!r || r.error) return null;
    return { ...r, cards: oneEach(r.cards ?? []) };
  } catch { return null; }
}

/** One row per catalogue id.
 *
 *  One Piece publishes its alternate arts under the SAME id as the card they
 *  are an alternate of — Charlotte Linlin 112 arrives three times, as itself,
 *  as "(Alternate Art)" and as "(Manga)". They are three different objects
 *  with three different prices, and we cannot tell them apart: every route in
 *  the app addresses a card by that one id, so all three open the same page.
 *
 *  Shown as three, they were three identical-looking entries in a set of 169
 *  that behaved as one, and React refused the duplicate keys outright. So the
 *  set holds one of each id, and it is the BASE printing — the name with no
 *  parenthetical after the number — because that is the card the id resolves
 *  to when it is priced.
 *
 *  Modelling the alternates properly needs artwork as a catalogue field,
 *  which is the variant gap on the scope list; until then, showing one card
 *  once is the honest half of it. */
function oneEach(cards: SetDetail["cards"]): SetDetail["cards"] {
  const seen = new Map<string, SetDetail["cards"][number]>();
  for (const c of cards) {
    const had = seen.get(c.cardId);
    if (!had) { seen.set(c.cardId, c); continue; }
    // A later row replaces an earlier one only if it is more plainly the
    // base card, or it has a picture where the one we kept has none.
    const better = (rank(c) < rank(had)) || (rank(c) === rank(had) && !had.imageUrl && !!c.imageUrl);
    if (better) seen.set(c.cardId, c);
  }
  return [...seen.values()];
}

/** 0 for a plain name, 1 for one carrying a parenthetical variant. */
const rank = (c: { name: string }) => (/\)\s*$/.test(c.name.replace(/\(\d+\)\s*$/, "")) ? 1 : 0);

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
  shops: ShopQuote[] | null;
  /** Every printing this collector number has, from TCGplayer's catalogue.
   *
   *  One card number is often several physically different cards: OP13-118 is
   *  a base Secret Rare at about US$13 and a Red Super Alternate Art in four
   *  figures. Our own catalogue gives them one id, so this is the only place
   *  the app can learn that the card in front of someone might be either. */
  variants: Variant[] | null;
  /** The printings disagree by more than a factor of three, so no single
   *  figure describes this number. The page must ask which one rather than
   *  pick. */
  variantsAmbiguous?: boolean;
};

export type Variant = {
  productId: number;
  name: string;
  /** "Red Super Alternate Art". Null on the base printing. */
  variant: string | null;
  rarity: string | null;
  imageUrl: string | null;
  url: string | null;
  /** From completed sales. Null on a card too scarce to have any — which is
   *  exactly the card people care most about. */
  marketUsd: number | null;
  lowUsd: number | null;
  highUsd: number | null;
  /** The cheapest Near Mint copy listed right now. An ASK, kept separate
   *  from the market price so the two are never quietly merged. */
  listedUsd: number | null;
  listedCondition: string | null;
};

/** What a printing is going for, and what kind of number that is.
 *
 *  The ASK leads. A sale is what one copy went for at some point in the past,
 *  and on a card that changes hands a few times a year that past can be
 *  months old; an ask is what somebody wants for one today. On the scarcest
 *  printings the ask is also the only figure that exists at all.
 *
 *  The sold figure is still returned beside it, because "asking 19,999, last
 *  sold 12,000" is a more useful pair of facts than either alone. */
export function priceOf(v: Variant): { usd: number; sold: boolean } | null {
  if (v.listedUsd != null && v.listedUsd > 0) return { usd: v.listedUsd, sold: false };
  if (v.marketUsd != null && v.marketUsd > 0) return { usd: v.marketUsd, sold: true };
  return null;
}

/** The last sale, when it says something the ask does not.
 *
 *  Both figures ultimately come from the same marketplace, so on a card that
 *  trades normally the cheapest listing IS roughly the market price and
 *  printing "asking US$2,116 · sold US$2,116.43" is one number twice. It is
 *  worth showing only when the two have come apart — which is the case that
 *  actually tells you something: a card being asked well above what one last
 *  went for is a seller testing the market, and the gap is the story. */
export function alsoSold(v: Variant): number | null {
  const ask = v.listedUsd;
  const sold = v.marketUsd;
  if (ask == null || ask <= 0 || sold == null || sold <= 0) return null;
  const apart = Math.abs(ask - sold) / Math.min(ask, sold);
  return apart > 0.08 ? sold : null;
}

/** One place this card can be bought, and what it costs there.
 *
 *  `kind` is the part that must not be flattened away on screen. A `live` row
 *  is a listing somebody is selling right now and the url opens it. A `market`
 *  row is the marketplace's own published price for the product — a real
 *  number from a real shop, but a summary of their market rather than a copy
 *  that is definitely in stock, because neither TCGplayer nor Cardmarket lets
 *  us read their sellers' inventory. */
export type ShopQuote = {
  id: "tcgplayer" | "cardmarket" | "ebay" | "grailmarket";
  name: string;
  kind: "live" | "market";
  price: number;
  currency: string;
  basis: string;
  low: number | null;
  high: number | null;
  count: number | null;
  url: string | null;
  updated: string | null;
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
  change30d?: number | null; change90d?: number | null;
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
      const sorted = [...r].sort(
        (a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0),
      );
      // The feed names the card and often has no picture of it. A mover
      // drawn as a grey placeholder on a rail of art is the one nobody
      // taps; the set catalogue has the picture — see lib/art.
      const bare = sorted.filter((p) => p.cardId && !isLoadable(p.imageUrl)).map((p) => p.cardId!);
      if (!bare.length) return sorted;
      const found = await artFor(bare);
      return sorted.map((p) => (p.cardId && found.has(p.cardId) ? { ...p, imageUrl: found.get(p.cardId)! } : p));
    }
    return [];
  } catch { return []; }
}

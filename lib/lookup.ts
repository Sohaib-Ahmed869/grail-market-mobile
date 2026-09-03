import { get } from "./api";
import type { CardHit } from "./cards";

// Typing what is printed on the card, instead of what it is called.
//
// A search box only helps somebody who already knows the name. A collector
// holding a slab knows two things for certain that are not the name: the set
// code and number printed on the face, and the certificate number on the
// label. Both identify a card exactly, which no name does — "Charizard" is
// forty cards across four orders of magnitude.
//
// The parsing is on the server so the app and the rules cannot disagree about
// what counts as a cert number; this is the thin client for it.

export type Lookup =
  | { kind: "card"; card: CardHit }
  | { kind: "search"; query: string; results: CardHit[]; note?: string }
  | { kind: "cert"; cert: string; grader: string | null; links: { grader: string; url: string }[] };

export async function lookup(q: string): Promise<Lookup | null> {
  const term = q.trim();
  if (!term) return null;
  try {
    return await get<Lookup>(`/market/lookup?q=${encodeURIComponent(term)}`);
  } catch {
    return null;
  }
}

/** Does this look like something the lookup handles better than a name search?
 *
 *  Kept in step with the server's parser by shape rather than by duplicating
 *  it: a digit anywhere is enough to be worth asking, and everything else
 *  goes down the ordinary search path without a round trip. */
export const looksLikeCode = (q: string) => /\d/.test(q);

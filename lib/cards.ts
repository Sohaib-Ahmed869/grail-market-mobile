import { get } from "./api";

export type CardHit = {
  cardId: string; name: string; nameLocal: string | null;
  setId: string; setName: string; localId: string;
  rarity: string | null; imageUrl: string | null; game: string; score: number;
};

/** Search the catalogue.
 *
 *  The backend takes a name or a printed code — "OP13-119" finds one card,
 *  "charizard" finds many — so the app sends whatever was typed rather than
 *  trying to work out which kind of query it is. */
export async function searchCards(q: string): Promise<CardHit[]> {
  const t = q.trim();
  if (t.length < 2) return [];
  try {
    const r = await get<{ results?: CardHit[] }>(`/market/search?q=${encodeURIComponent(t)}`);
    return r.results ?? [];
  } catch {
    return [];
  }
}


export type Interest = { following: number; holding: number; views: number; faces: string[] };

/** How many people here follow, hold or have looked at a card.
 *
 *  Never blocks the page: a failure answers zeros, because social proof going
 *  quiet is a far better outcome than a card that will not open. */
export async function cardInterest(catalogId: string): Promise<Interest> {
  const empty: Interest = { following: 0, holding: 0, views: 0, faces: [] };
  try {
    const r = await get<Interest>(`/market/interest?catalogId=${encodeURIComponent(catalogId)}`);
    return { ...empty, ...r };
  } catch {
    return empty;
  }
}

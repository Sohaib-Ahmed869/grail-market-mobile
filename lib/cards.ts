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


export type CardTrend = {
  price: number | null;
  change24h: number | null; change7d: number | null;
  change30d: number | null; change90d: number | null;
  spark: number[]; low7: number | null; high7: number | null;
};

/** What this card has done. Null when the feed does not carry it, which is a
 *  real answer — the page shows the rest of itself and says nothing about a
 *  trend rather than drawing a flat line. */
export async function cardTrend(a: {
  cardId: string; name: string; game?: string | null;
}): Promise<CardTrend | null> {
  const p = new URLSearchParams({ cardId: a.cardId, name: a.name });
  if (a.game) p.set("game", a.game);
  try {
    const r = await get<{ trend?: CardTrend | null }>(`/market/trend?${p}`);
    return r.trend ?? null;
  } catch {
    return null;
  }
}

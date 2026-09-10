import { setDetail } from "./cardmarket";

/** Pictures for cards that arrived without one.
 *
 *  The pulse, the watchlist and the card lookup all answer from what the
 *  store holds about a card, and for a card it only has a row about that
 *  is no picture — so a mover on the home screen and a follow on the
 *  watchlist both drew as a grey placeholder while the set page next door
 *  showed the art. The set has it, and for the two catalogues whose ids
 *  say which set that is, it is one cached read per set. Only the ids
 *  handed in are looked up; nothing is fetched for a card that already has
 *  a picture, and a card whose id says nothing about its set is skipped. */
export async function artFor(ids: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const bySet = new Map<string, string[]>();
  for (const id of ids) {
    const set = setOf(id);
    if (!set) continue;
    bySet.set(set, [...(bySet.get(set) ?? []), id]);
  }
  await Promise.all([...bySet.entries()].map(async ([setId, want]) => {
    const d = await setDetail(setId);
    for (const c of d?.cards ?? []) {
      if (c.imageUrl && want.includes(c.cardId) && !found.has(c.cardId)) found.set(c.cardId, c.imageUrl);
    }
  }));
  return found;
}

export const isLoadable = (u: string | null | undefined) => Boolean(u && /^https?:\/\//.test(u));

/** The set a catalogue id belongs to, for the ids that say. Pokemon's
 *  `me05-001` is card 001 of `me05`; One Piece's `optcg-OP13-119` is card
 *  119 of `optcg:OP-13`. Every other catalogue uses an opaque id, and null
 *  is the honest answer there. */
export function setOf(catalogId: string): string | null {
  // The card id says OP13; the set endpoint wants OP-13.
  const op = catalogId.match(/^optcg-([A-Z]+)(\d+)-/);
  if (op) return `optcg:${op[1]}-${op[2]}`;
  if (catalogId.includes(":") || catalogId.startsWith("optcg")) return null;
  const cut = catalogId.lastIndexOf("-");
  return cut > 0 ? catalogId.slice(0, cut) : null;
}

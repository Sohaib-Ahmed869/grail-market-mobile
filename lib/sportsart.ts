import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "./api";

// Pictures and live asks for sports players, fetched when a player is about
// to be seen.
//
// A sports set arrives as a list of players, and only the few whose names
// happened to appear in the listings that came back with the set have a
// picture. The server can find a picture for any one player, and the same
// lookup learns the cheapest copy of that player listed right now — but each
// costs an eBay call, so this asks only for the players actually on screen,
// twelve at a time, and remembers every answer for the life of the app —
// including "no picture" and "nothing listed", which are answers and must not
// be asked for again on every scroll.

/** The cheapest single copy of a player in a set on sale now. A listing, not
 *  a value for the card. */
export type SportAsk = { price: number; currency: string; count?: number | null };

const known = new Map<string, string | null>();
const knownAsks = new Map<string, SportAsk | null>();
const inflight = new Set<string>();
const BATCH = 12;
/** An API build older than live asks answers pictures only. Remembered, so
 *  the page does not re-ask every player on every scroll for a field that
 *  will never come. */
let asksSupported = true;

export const isSportsCard = (id: string | null | undefined) => Boolean(id && id.startsWith("sport-"));

async function fetchArt(ids: string[]): Promise<{ art: Record<string, string | null>; asks: Record<string, SportAsk | null> }> {
  try {
    const r = await get<{ art?: Record<string, string | null>; asks?: Record<string, SportAsk | null> }>(
      `/market/sports/art?ids=${ids.map(encodeURIComponent).join(",")}`,
    );
    if (r.asks === undefined) asksSupported = false;
    return { art: r.art ?? {}, asks: r.asks ?? {} };
  } catch {
    // Not remembered: a failed request is not "this player has no picture",
    // and an older API build without the endpoint must not poison the cache
    // for the one that has it.
    return { art: {}, asks: {} };
  }
}

/** `art` is every picture found so far, `asks` every live ask; `want(ids)`
 *  asks for any not yet known. Safe to call on every render or viewability
 *  change — ids already known or already on their way are skipped. */
export function useSportsArt() {
  const [art, setArt] = useState<Record<string, string | null>>(() => Object.fromEntries(known));
  const [asks, setAsks] = useState<Record<string, SportAsk | null>>(() => Object.fromEntries(knownAsks));
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const want = useCallback((ids: (string | null | undefined)[]) => {
    const missing = [...new Set(ids)].filter(
      (id): id is string =>
        isSportsCard(id) && (!known.has(id!) || (asksSupported && !knownAsks.has(id!))) && !inflight.has(id!),
    );
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      batch.forEach((id) => inflight.add(id));
      void fetchArt(batch).then((got) => {
        for (const id of batch) {
          inflight.delete(id);
          if (id in got.art) known.set(id, got.art[id] ?? null);
          if (id in got.asks) knownAsks.set(id, got.asks[id] ?? null);
        }
        if (!alive.current) return;
        if (Object.keys(got.art).length) setArt((a) => ({ ...a, ...got.art }));
        if (Object.keys(got.asks).length) setAsks((a) => ({ ...a, ...got.asks }));
      });
    }
  }, []);

  return { art, asks, want };
}

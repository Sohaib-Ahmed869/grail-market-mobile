import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "./api";

// Pictures for sports players, fetched when a player is about to be seen.
//
// A sports set arrives as a list of players, and only the few whose names
// happened to appear in the listings that came back with the set have a
// picture — about one in fifteen. The rest were a grid of blank card icons.
// The server can find a picture for any one player, but each costs an eBay
// call, so this asks only for the players actually on screen, twelve at a
// time, and remembers every answer for the life of the app — including "no
// picture", which is an answer and must not be asked for again on every
// scroll.

const known = new Map<string, string | null>();
const inflight = new Set<string>();
const BATCH = 12;

export const isSportsCard = (id: string | null | undefined) => Boolean(id && id.startsWith("sport-"));

async function fetchArt(ids: string[]): Promise<Record<string, string | null>> {
  try {
    const r = await get<{ art?: Record<string, string | null> }>(
      `/market/sports/art?ids=${ids.map(encodeURIComponent).join(",")}`,
    );
    return r.art ?? {};
  } catch {
    // Not remembered: a failed request is not "this player has no picture",
    // and an older API build without the endpoint must not poison the cache
    // for the one that has it.
    return {};
  }
}

/** `art` is every picture found so far; `want(ids)` asks for any not yet
 *  known. Safe to call on every render or viewability change — ids already
 *  known or already on their way are skipped. */
export function useSportsArt() {
  const [art, setArt] = useState<Record<string, string | null>>(() => Object.fromEntries(known));
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const want = useCallback((ids: (string | null | undefined)[]) => {
    const missing = [...new Set(ids)].filter(
      (id): id is string => isSportsCard(id) && !known.has(id!) && !inflight.has(id!),
    );
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      batch.forEach((id) => inflight.add(id));
      void fetchArt(batch).then((got) => {
        for (const id of batch) {
          inflight.delete(id);
          if (id in got) known.set(id, got[id] ?? null);
        }
        if (alive.current && Object.keys(got).length) setArt((a) => ({ ...a, ...got }));
      });
    }
  }, []);

  return { art, want };
}

import { SCAN_API } from "./api";
import { authHeader } from "./session";

// A scan is a multipart upload, not JSON — the backend wants the original
// bytes. Deliberately no resizing on the way out: shrinking to 2000px once
// lost a collector number and mispriced a card by thirty times, and the number
// is often four points of type in a corner.

export type Identification = {
  name?: string; setName?: string; localId?: string; rarity?: string;
  game?: string; language?: string; cardId?: string; printing?: string;
  imageUrl?: string | null; matchScore?: number; ocrName?: string;
};

export type ScanResult = {
  id?: string;
  /** The matches we did not choose, best first, with the chosen one first.
   *
   *  Empty when there was no real alternative. A wrong answer used to have no
   *  route out except scanning the same card again. */
  candidates?: { identification: Identification; valuation?: unknown }[] | null;
  identification?: {
    name?: string; setName?: string; localId?: string; rarity?: string;
    game?: string; language?: string; cardId?: string; printing?: string;
    // The catalogue's own render, and how close the name we read was to it.
    // Both are shown: a match is a claim, and a claim should carry its
    // evidence next to the photograph the person actually took.
    imageUrl?: string | null; matchScore?: number; ocrName?: string;
  } | null;
  rejection?: { reason?: string; hint?: string } | null;
  valuation?: {
    slabGrader?: string | null; slabGrade?: number | null; certNumber?: string | null;
    slabPrice?: { price: number; basis: string; confidence: string; sampleSize?: number | null;
                  // The band the estimate sits in. The API has always sent these;
                  // the type simply never named them, so the screen could not show
                  // the reader how wide the answer actually is.
                  low?: number | null; high?: number | null;
                  explain?: string; method?: string } | null;
    liveAsk?: {
      median: number; low: number | null; high: number | null; count: number;
      /** how many came back BEFORE narrowing to this card and grade — the
       *  difference between the two is what the filters did, and saying it is
       *  what lets a reader judge the sample rather than trust it. */
      total?: number | null;
      /** the dearest ask has sat this long unsold, so it is a ceiling on the
       *  market rather than a reading of it */
      staleCeilingDays?: number | null;
      cappedByStale?: boolean | null;
    } | null;
    tcgplayer?: { market?: number | null } | null;
    pricesByGrader?: Record<string, Record<string, { price: number; sampleSize?: number }>> | null;
    currency?: string;
  } | null;
  ocrNames?: string[];
};

/** "No, it's the other one." Re-prices from what was already fetched — no
 *  photograph is sent again and vision never runs twice over the same pixels. */
export async function pickCandidate(
  scanId: string, cardId: string,
): Promise<ScanResult | null> {
  try {
    const res = await fetch(`${SCAN_API}/scans/${scanId}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ cardId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ScanResult;
  } catch { return null; }
}

export type ScanQuota = {
  plan: string; used: number; limit: number | null; remaining: number | null;
  resetsOn?: string; anonymous?: boolean;
};

/** How many scans are left this month. Asked before the camera opens, so the
 *  answer arrives before somebody has taken a photograph they cannot use. */
export async function scanQuota(): Promise<ScanQuota | null> {
  try {
    const res = await fetch(`${SCAN_API}/scans/quota`, { headers: { ...authHeader() } });
    if (!res.ok) return null;
    return (await res.json()) as ScanQuota;
  } catch { return null; }
}

export type ScanOutcome =
  | { ok: true; scan: ScanResult }
  | { ok: false; message: string };

/** Send a photograph and get back what it is and what it is worth.
 *
 *  This takes ten to thirty seconds: the image is detected and warped, text
 *  and any grading label are read, the card is matched against several
 *  catalogues, and only then is it priced. The caller is expected to say so
 *  rather than show a spinner and hope. */
export async function scanCard(
  frontUri: string, backUri?: string,
): Promise<ScanOutcome> {
  const body = new FormData();
  body.append("front", {
    uri: frontUri, name: "front.jpg", type: "image/jpeg",
  } as unknown as Blob);
  if (backUri) {
    body.append("back", { uri: backUri, name: "back.jpg", type: "image/jpeg" } as unknown as Blob);
  }

  try {
    const res = await fetch(`${SCAN_API}/scans`, {
      method: "POST",
      // Content-Type is left unset on purpose: fetch has to add the multipart
      // boundary itself, and setting it by hand produces a body the server
      // cannot split.
      headers: { ...authHeader() },
      body,
    });
    if (!res.ok) {
      return { ok: false, message: `The scan failed (${res.status}). Try again.` };
    }
    return { ok: true, scan: (await res.json()) as ScanResult };
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection." };
  }
}

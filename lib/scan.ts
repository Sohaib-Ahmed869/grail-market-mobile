import { SCAN_API } from "./api";
import { authHeader } from "./session";

// A scan is a multipart upload, not JSON — the backend wants the original
// bytes. Deliberately no resizing on the way out: shrinking to 2000px once
// lost a collector number and mispriced a card by thirty times, and the number
// is often four points of type in a corner.

export type ScanResult = {
  id?: string;
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
                  explain?: string; method?: string } | null;
    liveAsk?: { median: number; low: number | null; high: number | null; count: number } | null;
    tcgplayer?: { market?: number | null } | null;
    pricesByGrader?: Record<string, Record<string, { price: number; sampleSize?: number }>> | null;
    currency?: string;
  } | null;
  ocrNames?: string[];
};

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

import type { ScanResult } from "./scan";

/** The scan just taken, held between the scan screen and the result.
 *
 *  A module variable rather than route params: the result is a deep object
 *  with nested price ladders, and route params are serialised into the URL.
 *  It would arrive as a string, and a URL is the wrong place for it anyway. */
let last: ScanResult | null = null;
/** The photographs that produced it.
 *
 *  Kept beside the result because a rejection is unreadable without them. Told
 *  "too much glare" with nothing on screen, a person has no idea whether they
 *  photographed the wrong thing, cropped it badly, or caught the light — and
 *  the answer is visible the instant they see their own shot. */
let lastShots: { front: string; back?: string } | null = null;

export const setLastScan = (s: ScanResult, shots?: { front: string; back?: string }) => {
  last = s;
  if (shots) lastShots = shots;
};
export const getLastScan = () => last;
export const getLastShots = () => lastShots;

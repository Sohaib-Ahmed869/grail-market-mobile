import type { ScanResult } from "./scan";

/** The scan just taken, held between the scan screen and the result.
 *
 *  A module variable rather than route params: the result is a deep object
 *  with nested price ladders, and route params are serialised into the URL.
 *  It would arrive as a string, and a URL is the wrong place for it anyway. */
let last: ScanResult | null = null;
export const setLastScan = (s: ScanResult) => { last = s; };
export const getLastScan = () => last;

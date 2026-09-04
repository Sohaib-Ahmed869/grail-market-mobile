import { useEffect, useState } from "react";
import { get } from "./api";

// Every price we buy comes back in US dollars — TCGplayer, the price tracker,
// eBay comps. The people using this app are in Australia.
//
// Printing a US figure behind an A$ sign is the exact shape of mistake the
// pricing rules exist to stop, so conversion happens in one place, the rate is
// shown, and anything we could not convert stays in the currency it arrived
// in rather than being relabelled.

export type Fx = { base: "USD"; date: string; rates: Record<string, number> };

let cache: Fx | null = null;
let inFlight: Promise<Fx | null> | null = null;
const listeners = new Set<(f: Fx | null) => void>();

export async function loadFx(): Promise<Fx | null> {
  if (cache) return cache;
  if (inFlight) return inFlight;
  inFlight = get<Fx>("/market/fx")
    .then((f) => {
      cache = f;
      listeners.forEach((l) => l(f));
      return f;
    })
    .catch(() => null)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** The rate, or null while we do not have one. Never a guess. */
export const usdToAud = (fx: Fx | null) => fx?.rates?.AUD ?? null;

export function useFx(): Fx | null {
  const [f, setF] = useState<Fx | null>(cache);
  useEffect(() => {
    listeners.add(setF);
    loadFx();
    return () => { listeners.delete(setF); };
  }, []);
  return f;
}

/** A price with the currency it is actually in.
 *
 *  `from` is what the number arrived as. If we cannot convert it, it is shown
 *  in that currency with its own symbol — an unconverted US price labelled A$
 *  is a 40% error nobody can see. */
export function money(
  n: number | null | undefined,
  { fx, from = "USD", to = "AUD" }: { fx?: Fx | null; from?: string; to?: string } = {},
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const symbol = (c: string) => (c === "AUD" ? "A$" : c === "USD" ? "US$" : `${c} `);
  if (from === to) return `${symbol(to)}${figure(n)}`;

  const rate = fx?.rates?.[to] != null && fx?.rates?.[from] != null
    ? fx.rates[to] / fx.rates[from]
    : null;
  if (rate == null) return `${symbol(from)}${figure(n)}`;
  return `${symbol(to)}${figure(n * rate)}`;
}

/** An amount already IN Australian dollars — a listing, an offer, a total.
 *
 *  Nine screens had their own copy of this and every copy rounded, so the same
 *  32-cent card read "A$0" wherever it appeared. One implementation, so the
 *  next change to how money looks is one change. Use `money()` above when the
 *  figure is in another currency and needs converting. */
export const aud = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? "—" : `A$${figure(n)}`;

/** Whole dollars, EXCEPT where whole dollars lose the number.
 *
 *  This rounded everything, so a 32-cent common rendered as "A$0" — not as a
 *  cheap card but as a worthless one, which is a different claim and a wrong
 *  one. Most of a Pokemon set is under a dollar, so this was most of the
 *  catalogue.
 *
 *  Cents below ten, whole dollars above. A collection worth A$3,910 does not
 *  want ".00" on the end, and a card worth A$0.32 does not want rounding. */
function figure(n: number): string {
  const abs = Math.abs(n);
  if (abs > 0 && abs < 0.01) return "<0.01";
  if (abs < 10) return n.toFixed(2);
  return Math.round(n).toLocaleString();
}

/** "converted from US$1,345 at 1.3963" — the sentence that makes the number
 *  above it checkable. */
export function conversionNote(
  n: number | null | undefined, fx: Fx | null, from = "USD",
): string | null {
  if (n == null || from === "AUD") return null;
  const rate = fx?.rates?.AUD;
  if (rate == null) return null;
  // Through `figure` like everything else. This is the sentence that makes the
  // number above it checkable, so rounding here and not there — "A$0.33
  // converted from US$0 at 1.3902" — breaks the one thing it is for.
  return `converted from US$${figure(n)} at ${rate.toFixed(4)} · ${fx?.date ?? ""}`;
}

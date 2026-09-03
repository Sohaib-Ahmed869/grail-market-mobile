import { useEffect, useState } from "react";
import { get } from "./api";
import { getSession, onSession } from "./session";

// What this member is allowed to do, and what stands in the way.
//
// The tier is computed on the server from the identity row, the subscription
// and the sales history — never stored, never guessed here. The app's job is
// to show it and to stop someone walking into a refusal at the end of a long
// flow, which is the actual point: a gate that fires on the last screen of
// the sell flow has already wasted ten minutes of photography.

export type Gate = { need: number; ok: boolean; missing: string | null };

export type Tier = {
  tier: 0 | 1 | 2 | 3;
  identityStatus: string;
  highValueThresholdAud: number;
  have: {
    phone: boolean; payment: boolean; identity: boolean;
    address: boolean; completedSales: number;
  };
  gates: { offer: Gate; sell: Gate; sellHighValue: Gate };
};

export const TIER_NAMES = ["Browsing", "Buying", "Selling", "High Value"] as const;

/** What each rung is for, in the order they are earned. */
export const LADDER = [
  { tier: 0, name: "Browsing", need: "An email address",
    opens: "Search, the market, the community" },
  { tier: 1, name: "Buying", need: "A phone number and a payment method",
    opens: "Offers and messages to sellers" },
  { tier: 2, name: "Selling", need: "A government ID, a selfie and a liveness check",
    opens: "Listing your own cards" },
  { tier: 3, name: "High Value", need: "An address check and three completed sales",
    opens: "Selling above the high-value line" },
] as const;

let cache: Tier | null = null;

export async function fetchTier(userId: string): Promise<Tier | null> {
  try {
    const r = await get<Tier>(`/identity/tier/${encodeURIComponent(userId)}`);
    cache = r;
    return r;
  } catch { return null; }
}

/** The tier, refreshed whenever the screen using it comes back.
 *
 *  Returns the cached answer immediately so a gate never flashes "blocked"
 *  before it knows — showing a refusal to someone who is not refused is worse
 *  than a moment of nothing. */
export function useTier(): { tier: Tier | null; refresh: () => void } {
  const [t, setT] = useState<Tier | null>(cache);

  const load = () => {
    const s = getSession();
    if (!s) { cache = null; setT(null); return; }
    fetchTier(s.userId).then((r) => setT(r));
  };

  useEffect(() => {
    load();
    return onSession(() => load());
  }, []);

  return { tier: t, refresh: load };
}

import { get, post } from "./api";

// What happens after "yes".
//
// There was nothing between an accepted offer and a card the seller alone
// declared sold. The buyer was never asked whether anything arrived, so the
// one person with an interest in the truth of it had no say.

export type DealState = "agreed" | "handed_over" | "complete" | "cancelled";

export type DealRow = {
  dealId: string;
  listingId: string;
  state: DealState;
  amount: number;
  currency: string;
  cardName: string;
  setName: string | null;
  imageUrl: string | null;
  role: "buyer" | "seller";
  counterparty: string | null;
  agreedAt: string;
  handedOverAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type Deal = DealRow & {
  cardNumber: string | null;
  grader: string | null;
  grade: string | null;
  photos: { angle: string; url: string }[];
  counterpartyId: string;
  cancelReason: string | null;
  cancelledByMe: boolean;
  /** What THIS person can do now. Decided by the server, so two clients
   *  cannot work it out differently from the same state. */
  can: { handOver: boolean; confirm: boolean; cancel: boolean; rate: boolean };
};

export async function myDeals(): Promise<DealRow[]> {
  try {
    const r = await get<{ deals?: DealRow[] }>("/deals");
    return r.deals ?? [];
  } catch { return []; }
}

export async function deal(id: string): Promise<Deal | null> {
  try {
    const r = await get<{ deal?: Deal; error?: string }>(`/deals/${encodeURIComponent(id)}`);
    return r?.error || !r?.deal ? null : r.deal;
  } catch { return null; }
}

type Acted = { state?: DealState; message?: string; error?: string };

/** The seller has sent it. */
export const handOver = (id: string): Promise<Acted> =>
  act(`/deals/${encodeURIComponent(id)}/handover`);

/** The buyer has it. This is the only thing that closes a deal. */
export const confirmReceived = (id: string): Promise<Acted> =>
  act(`/deals/${encodeURIComponent(id)}/received`);

export const callOff = (id: string, reason?: string): Promise<Acted> =>
  act(`/deals/${encodeURIComponent(id)}/cancel`, { reason: reason ?? null });

async function act(path: string, body: any = {}): Promise<Acted> {
  try {
    return await post<Acted>(path, body);
  } catch {
    return { error: "network", message: "That could not be sent. Check your connection." };
  }
}

/** The four steps, as the person on this side of them sees it.
 *
 *  Written per role rather than once, because the same state means opposite
 *  things to the two people in it: `handed_over` is "you have done your part"
 *  to one of them and "it is on its way, say when it lands" to the other. A
 *  single wording would have to be vague enough to suit both, and vague is
 *  what leaves somebody waiting for the other to move. */
export function stepsFor(d: Deal | DealRow, role: "buyer" | "seller") {
  const done = (s: DealState[]) => s.includes(d.state);
  const seller = role === "seller";
  return [
    {
      key: "agreed",
      title: "Agreed",
      body: seller
        ? "You accepted the offer. The card is off the market."
        : "Your offer was accepted. The card is held for you.",
      done: true,
    },
    {
      key: "handed_over",
      title: seller ? "Send it" : "On its way",
      body: seller
        ? "Post it or hand it over, then mark it sent here."
        : "The seller marks it sent once it is on its way.",
      done: done(["handed_over", "complete"]),
    },
    {
      key: "complete",
      title: seller ? "Buyer confirms" : "Confirm it arrived",
      body: seller
        ? "The deal closes when they confirm it reached them."
        : "Check the card against the listing, then confirm.",
      done: done(["complete"]),
    },
  ];
}

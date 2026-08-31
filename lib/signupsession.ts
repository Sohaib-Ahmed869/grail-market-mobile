import type { Confirmation } from "./phoneauth";

/** The pending verification, held between the signup screen and the code
 *  screen.
 *
 *  It is a module variable rather than route params on purpose: the Firebase
 *  confirmation is a live object with a method on it, and route params are
 *  serialised to the URL. Passing it through navigation would arrive as a
 *  useless string, and putting a phone number in a URL is not something to do
 *  casually either. */
type Pending = { phone: string; session: Confirmation; sentAt: number } | null;

let pending: Pending = null;

export const setPending = (phone: string, session: Confirmation) => {
  pending = { phone, session, sentAt: Date.now() };
};
export const getPending = () => pending;
export const clearPending = () => { pending = null; };

/** Firebase codes last a few minutes. Knowing it is stale lets the code screen
 *  offer a resend instead of letting someone type into a dead session. */
export const pendingIsStale = () =>
  pending != null && Date.now() - pending.sentAt > 5 * 60_000;

import { useEffect, useState } from "react";
import { clearSession, getSession } from "./session";

// Looking around without an account.
//
// "Look around first" used to be a plain navigation to the tab bar. If a
// session was still in the keychain — and it always was, once anyone had
// signed in on that device — the app went on being signed in as them. The
// button said "no account" and the app said "Hello, Sohaib".
//
// So guest is a real state, not the absence of one. Entering it signs the
// device out, because "no account" has to mean no account, and every screen
// that needs a member can ask one question: are we a guest.

let guest = false;
const listeners = new Set<(g: boolean) => void>();

const publish = (g: boolean) => {
  guest = g;
  listeners.forEach((l) => l(g));
};

/** Browse with no account. Signs out first — a half-signed-in state is how
 *  the guest path leaked someone else's collection onto the home screen. */
export async function enterGuest(): Promise<void> {
  if (getSession()) await clearSession();
  publish(true);
}

/** Leaving guest is signing in or signing up; both end here. */
export const leaveGuest = () => publish(false);

export const isGuest = () => guest && !getSession();

export function useGuest(): boolean {
  const [g, setG] = useState(isGuest());
  useEffect(() => {
    const fn = () => setG(isGuest());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return g;
}

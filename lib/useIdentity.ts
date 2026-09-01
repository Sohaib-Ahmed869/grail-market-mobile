import { useEffect, useState } from "react";
import { fetchStatus, type IdentityStatus } from "./identity";

// One answer to "is this person verified", shared by every screen that asks.
//
// It was two screens disagreeing that made this necessary: the gate learned to
// check and the levels screen did not, so the app told you that you were
// verified and offered to verify you within a tap of each other. Anything a
// screen decides for itself is a place they can drift apart.
//
// Deliberately small: a module-level cache, a set of subscribers, and a
// refresh. No dependency, and the state survives navigation because it does
// not live in a component.

let cached: IdentityStatus | null = null;
let inFlight: Promise<IdentityStatus> | null = null;
const listeners = new Set<(s: IdentityStatus) => void>();

function publish(s: IdentityStatus) {
  cached = s;
  listeners.forEach((l) => l(s));
}

/** Ask the backend, unless someone else already is. */
export async function refreshIdentity(userId: string): Promise<IdentityStatus> {
  if (inFlight) return inFlight;
  inFlight = fetchStatus(userId)
    .then((s) => { publish(s); return s; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Set locally after a flow finishes, so the UI moves before the poll lands. */
export const setIdentity = (s: IdentityStatus) => publish(s);

/** The current answer, and a refresh on mount.
 *
 *  `null` means we have not asked yet — which is different from Not Started,
 *  and screens should show neither state until they know. */
export function useIdentity(userId: string) {
  const [status, setStatus] = useState<IdentityStatus | null>(cached);

  useEffect(() => {
    listeners.add(setStatus);
    // Always re-ask on mount. A decision can arrive while the app is open —
    // the person may have finished in a browser on another device — and a
    // cache that is never refreshed is how the two screens disagreed.
    refreshIdentity(userId).catch(() => {});
    return () => { listeners.delete(setStatus); };
  }, [userId]);

  return {
    status,
    known: status != null,
    verified: status === "Approved",
    reviewing: status === "In Review",
    refresh: () => refreshIdentity(userId),
  };
}

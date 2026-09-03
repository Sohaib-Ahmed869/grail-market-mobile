/** Where the backend lives.
 *
 *  EXPO_PUBLIC_ variables are inlined into the bundle at build time, which is
 *  fine for a base URL and is exactly why no key may ever travel this way. */
import { authHeader } from "./session";

/** Two backends, because neither one can do everything.
 *
 *  Render runs the current API — auth, identity, billing, listings, offers,
 *  the collection — but has no vision service, so a scan there answers
 *  "vision service unreachable".
 *
 *  The AWS box runs the vision pipeline, and an OLD build of everything else:
 *  /auth, /collection, /listings and /identity all 404 there. Pointing the
 *  whole app at it is what made every button that needed one of those do
 *  nothing at all — a 404 with no error surface looks exactly like a dead
 *  control.
 *
 *  So the split is explicit: scans go to the box that can see, everything
 *  else goes to the box that is current. */
export const API =
  process.env.EXPO_PUBLIC_API_URL ?? "https://grail-market-backend.onrender.com";

/** Only /scans. The vision service lives here and nowhere else. */
export const SCAN_API =
  process.env.EXPO_PUBLIC_SCAN_URL ?? "https://grailmarket.duckdns.org";

export async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(), ...headers },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await failure(path, res);
  return (await res.json()) as T;
}

export async function get<T>(path: string) {
  const res = await fetch(`${API}${path}`, { headers: { ...authHeader() } });
  if (!res.ok) throw await failure(path, res);
  return (await res.json()) as T;
}

export async function del<T>(path: string) {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!res.ok) throw await failure(path, res);
  return (await res.json()) as T;
}

/** The server often knows a better sentence than we can guess from a status —
 *  a 429 carries how long to wait, and a rejected offer says why. Reading it
 *  costs one await on a path that has already failed. */
async function failure(path: string, res: Response): Promise<ApiError> {
  let message: string | undefined;
  try {
    const body = (await res.json()) as { message?: string };
    if (typeof body?.message === "string") message = body.message;
  } catch {
    // a proxy's HTML error page, or an empty body — the status still stands
  }
  return new ApiError(path, res.status, message);
}

/** A failed call that still knows what failed.
 *
 *  `new Error("/collection -> 404")` is unreadable on screen and indistinct
 *  in a catch. The status matters: 404 means this server build does not have
 *  the feature, 401 means sign in, anything else is a fault. */
export class ApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    /** What the server said, when it said anything. Preferred over anything
     *  this file could invent from the status alone. */
    readonly serverMessage?: string,
  ) {
    super(`${path} -> ${status}`);
    this.name = "ApiError";
  }
}

/** What to put in front of a person when a call fails. */
export function apiMessage(e: unknown, doing: string): string {
  const status = e instanceof ApiError ? e.status : null;
  // The server's own sentence, whenever it wrote one. It knows things this
  // does not — which field was wrong, how many seconds to wait.
  const said = e instanceof ApiError ? e.serverMessage : undefined;
  if (said) return said;
  if (status === 429) return "Too many attempts. Wait a minute and try again.";
  if (status === 404) return `The server doesn't support ${doing} yet — it's running an older build.`;
  if (status === 401 || status === 403) return "Sign in again to continue.";
  if (status != null) return `${doing} failed (${status}). Try again.`;
  return "Couldn't reach the server. Check your connection.";
}

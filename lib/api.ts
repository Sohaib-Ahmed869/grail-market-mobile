/** Where the backend lives.
 *
 *  EXPO_PUBLIC_ variables are inlined into the bundle at build time, which is
 *  fine for a base URL and is exactly why no key may ever travel this way. */
import { authHeader } from "./session";

/** One backend, on AWS.
 *
 *  This was split in two. Render ran the current API — auth, identity,
 *  billing, listings — while the AWS box ran the vision pipeline and an older
 *  build of everything else, so the app talked to whichever could answer.
 *
 *  That split is what made photographs impossible to fix: uploads went to
 *  Render, the S3 credentials were on AWS, and each side looked correctly
 *  configured from where its owner was standing. Two homes for one API is two
 *  places for the environment to disagree.
 *
 *  Both now point at the AWS box, which holds the credentials, the vision
 *  service and the same Neon database. It requires nginx there to proxy the
 *  whole API rather than only /scans — if /listings 404s, that is the reason
 *  and not this line. */
const AWS_API = "https://grailmarket.duckdns.org";

export const API = process.env.EXPO_PUBLIC_API_URL ?? AWS_API;

/** Scans go to the same place now. Kept as its own export because the vision
 *  service is a separate process behind that host and may move again. */
export const SCAN_API = process.env.EXPO_PUBLIC_SCAN_URL ?? AWS_API;

/** How long to wait before deciding the server is not going to answer.
 *
 *  React Native's `fetch` has NO default timeout, and neither did any call in
 *  this file. A request that connects and then goes quiet — a box under load,
 *  a proxy holding the socket, an upstream the API is itself waiting on —
 *  never settles, so the promise never resolves and never rejects. Every
 *  button in the app is `loading={busy}` around one of these with `busy`
 *  cleared in a `finally`, and a `finally` on a promise that never settles
 *  does not run. The button spins for as long as the screen is open, with no
 *  error, no toast and no way out.
 *
 *  Twenty seconds is far longer than any healthy call here and short enough
 *  that a person has not yet decided the app is broken. */
const TIMEOUT_MS = 20_000;

/** `fetch`, but it always finishes.
 *
 *  An abort is turned into an ApiError with status 0, so `apiMessage` has a
 *  sentence for it and every existing catch keeps working unchanged. */
async function call(path: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${API}${path}`, { ...init, signal: ctrl.signal });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw new ApiError(path, 0, "The server didn't answer. Check your connection and try again.");
    }
    throw e;
  } finally {
    // Cleared whichever way it went, or a slow-but-successful call leaves a
    // timer holding a reference to an abort nobody needs any more.
    clearTimeout(timer);
  }
}

export async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(), ...headers },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await failure(path, res);
  return (await res.json()) as T;
}

export async function get<T>(path: string) {
  const res = await call(path, { headers: { ...authHeader() } });
  if (!res.ok) throw await failure(path, res);
  return (await res.json()) as T;
}

/** An abort signal that fires after `ms`, for the calls that do not go through
 *  `get`/`post` — multipart uploads and the scan pipeline, which build their
 *  own requests and legitimately need longer than a JSON round trip.
 *
 *  Exported rather than duplicated, so there is one answer to "how long do we
 *  wait" and adding a new upload path cannot quietly reintroduce a request
 *  that hangs forever.
 *
 *  Usage: `fetch(url, { ..., signal: deadline(60_000) })`. The timer is
 *  cleared when the signal fires or the request settles, whichever is first. */
export function deadline(ms = TIMEOUT_MS): AbortSignal {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  // `abort` fires on the timeout; `unref` does not exist in RN, so the timer
  // is cleared from the signal itself once it is no longer needed.
  ctrl.signal.addEventListener?.("abort", () => clearTimeout(timer));
  return ctrl.signal;
}

/** A photograph is megabytes over a phone connection, and the API stores it
 *  in S3 before answering. A JSON timeout would abandon uploads that are
 *  working. */
export const UPLOAD_TIMEOUT_MS = 90_000;

export async function del<T>(path: string) {
  const res = await call(path, { method: "DELETE", headers: { ...authHeader() } });
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
  // 0 is ours, not the server's: the request was abandoned because nothing
  // came back. The message on the error says so; this is the fallback.
  if (status === 0) return "The server didn't answer. Try again in a moment.";
  if (status != null) return `${doing} failed (${status}). Try again.`;
  return "Couldn't reach the server. Check your connection.";
}

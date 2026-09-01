import { startVerification } from "@didit-protocol/sdk-react-native";
import { get, post } from "./api";

// Identity verification, from the app's side.
//
// The app never talks to Didit's API — it asks our backend for a session and
// hands the returned token to the SDK. The API key stays on the server, which
// is the whole reason this indirection exists: an app that could mint its own
// sessions could mint them for anybody.
//
// And the app never decides the outcome. `startVerification` tells us the
// person finished; it does not tell us they passed. Only the signed webhook
// our backend received can say that, so the result here is a cue to go and
// ask, never an answer in itself.

export type IdentityStatus =
  | "Not Started" | "In Progress" | "Awaiting User" | "In Review"
  | "Approved" | "Declined" | "Resubmitted" | "Abandoned"
  | "Expired" | "Kyc Expired";

export type RunResult =
  | { outcome: "finished"; sessionId?: string }
  | { outcome: "cancelled" }
  | { outcome: "failed"; message: string };

/** Open the verification flow. Resolves when the sheet closes. */
export async function runVerification(userId: string): Promise<RunResult> {
  let token: string;
  try {
    const s = await post<{ token?: string; error?: string; message?: string }>(
      "/identity/session",
      { userId },
      { "x-user-id": userId },
    );
    if (!s.token) {
      return { outcome: "failed", message: s.message ?? "Could not start verification." };
    }
    token = s.token;
  } catch (e: any) {
    return { outcome: "failed", message: "Could not reach the server. Check your connection." };
  }

  try {
    const r = await startVerification(token);
    switch (r.type) {
      case "completed":
        // "completed" means the flow ended, not that it passed.
        return { outcome: "finished", sessionId: (r as any).session?.sessionId };
      case "cancelled":
        return { outcome: "cancelled" };
      default:
        return { outcome: "failed", message: "Verification could not be completed." };
    }
  } catch (e: any) {
    if (__DEV__) console.warn("[identity] sdk error:", e);
    return { outcome: "failed", message: "Verification could not be started on this device." };
  }
}

/** What the backend currently believes, which is what the webhook told it. */
export async function fetchStatus(userId: string): Promise<IdentityStatus> {
  try {
    const r = await get<{ status?: IdentityStatus }>(
      `/identity/status/${encodeURIComponent(userId)}`,
    );
    return r.status ?? "Not Started";
  } catch {
    return "Not Started";
  }
}

/** Wait for a decision, within reason.
 *
 *  Didit's webhook usually lands within seconds of the sheet closing, but it
 *  is a separate network hop and can be slower. Polling with a ceiling is what
 *  lets the screen say "still checking" honestly instead of either hanging or
 *  claiming a result it has not been given. */
export async function awaitDecision(
  userId: string,
  { timeoutMs = 45_000, everyMs = 2_000 } = {},
): Promise<IdentityStatus> {
  const until = Date.now() + timeoutMs;
  let last: IdentityStatus = "In Progress";
  while (Date.now() < until) {
    last = await fetchStatus(userId);
    if (last === "Approved" || last === "Declined" || last === "In Review") return last;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return last;
}

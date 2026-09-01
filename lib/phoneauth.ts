import type { CountryCode } from "libphonenumber-js/min";
import { normalisePhone } from "./validate";

/** Phone verification, behind one interface.
 *
 *  Firebase is the implementation, not the contract. Everything the screens
 *  can see is `send`, `confirm` and a handful of error codes — so replacing it
 *  with Twilio Verify later is one file, not a hunt through the app. The same
 *  discipline the backend uses for price providers, for the same reason.
 *
 *  Firebase is loaded lazily. Its native module does not exist in Expo Go, and
 *  importing it at module scope would take the whole app down on launch rather
 *  than failing on the one screen that needs it.
 */

export type SendResult =
  | { ok: true; session: Confirmation }
  | { ok: false; code: PhoneAuthError; message: string };

export type ConfirmResult =
  | { ok: true; uid: string }
  | { ok: false; code: PhoneAuthError; message: string };

export type Confirmation = { confirm(code: string): Promise<{ user: { uid: string } | null }> };

/** DEVELOPMENT ONLY — the code that stands in for a real SMS.
 *
 *  Firebase will not send verification codes on the Spark plan; it answers
 *  auth/operation-not-allowed regardless of the provider being enabled. Rather
 *  than block the whole signup flow on a billing decision, this accepts one
 *  fixed code so the screens after it can be built and walked.
 *
 *  Set to null the moment Firebase billing is on. Two things make that hard to
 *  forget: __DEV__ means it cannot exist in a release build at all, and the
 *  code screen prints a banner saying the bypass is active. A bypass you
 *  cannot see is how one ships. */
export const STUB_CODE: string | null = __DEV__ ? "123456" : null;

/** Whether the stub is standing in. Exported so the UI can say so. */
export const usingStub = () => STUB_CODE != null;

export type PhoneAuthError =
  | "bad-number" | "too-many-requests" | "wrong-code" | "expired"
  | "unavailable" | "network" | "unknown";

/** What we put in front of a person. Firebase's own strings name internals
 *  ("auth/invalid-verification-code"), which is not something to show anyone. */
const SAY: Record<PhoneAuthError, string> = {
  "bad-number": "That number was rejected. Check it and try again.",
  "too-many-requests": "Too many attempts. Wait a few minutes before trying again.",
  "wrong-code": "That code is not right. Check the message and try again.",
  expired: "That code has expired. Ask for a new one.",
  unavailable: "Phone sign-in needs the full app — it does not run in Expo Go.",
  network: "No connection. Check your signal and try again.",
  unknown: "Something went wrong sending the code. Try again in a moment.",
};

function classify(e: unknown): PhoneAuthError {
  const code = String((e as { code?: string })?.code ?? "");
  // The user-facing strings below are deliberately vague; the real code is
  // what makes a failure diagnosable, and losing it cost an hour of guessing
  // at "something went wrong".
  if (__DEV__) console.warn("[phoneauth] firebase error:", code, e);
  if (code.includes("invalid-phone-number")) return "bad-number";
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) return "too-many-requests";
  if (code.includes("invalid-verification-code")) return "wrong-code";
  if (code.includes("code-expired") || code.includes("session-expired")) return "expired";
  if (code.includes("network")) return "network";
  return "unknown";
}

const fail = (code: PhoneAuthError) => ({ ok: false as const, code, message: SAY[code] });

async function firebaseAuth() {
  try {
    const mod = await import("@react-native-firebase/auth");
    return mod;
  } catch {
    return null; // Expo Go, or a build without the native module
  }
}

/** Ask Firebase to text a code. `phone` may be in any shape a person types. */
export async function sendCode(phone: string, country: CountryCode = "AU"): Promise<SendResult> {
  const e164 = normalisePhone(phone, country);
  if (!e164) return fail("bad-number");

  if (STUB_CODE != null) {
    console.warn(
      `[phoneauth] STUB ACTIVE — no SMS sent. The code is ${STUB_CODE}. ` +
        `Set STUB_CODE to null once Firebase billing is enabled.`,
    );
    return { ok: true, session: stubSession(e164) };
  }

  const mod = await firebaseAuth();
  if (!mod) return fail("unavailable");

  try {
    const session = await mod.signInWithPhoneNumber(mod.getAuth(), e164);
    return { ok: true, session: session as unknown as Confirmation };
  } catch (e) {
    return fail(classify(e));
  }
}

/** Check the six digits. A success here means the number is proven and the
 *  user is signed in — level 1, and only level 1. */
export async function confirmCode(session: Confirmation, code: string): Promise<ConfirmResult> {
  try {
    const cred = await session.confirm(code);
    const uid = cred?.user?.uid;
    if (!uid) return fail("unknown");
    return { ok: true, uid };
  } catch (e) {
    return fail(classify(e));
  }
}

/** A confirmation that behaves like Firebase's but checks one fixed code.
 *
 *  Same shape as the real thing, including the wrong-code error, so the screen
 *  exercises every branch it will exercise in production. */
function stubSession(e164: string): Confirmation {
  return {
    async confirm(code: string) {
      if (code !== STUB_CODE) {
        throw Object.assign(new Error("stub: wrong code"), {
          code: "auth/invalid-verification-code",
        });
      }
      // a stable fake uid, so repeated runs look like the same person
      return { user: { uid: `stub-${e164.replace(/\D/g, "")}` } };
    },
  };
}

/** True when the native module is present, so a screen can explain itself
 *  rather than throwing when someone opens the app in Expo Go. */
export async function phoneAuthAvailable(): Promise<boolean> {
  return (await firebaseAuth()) != null;
}

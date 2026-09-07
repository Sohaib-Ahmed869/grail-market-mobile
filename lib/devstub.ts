/** The stand-in for SMS verification.
 *
 *  Firebase will not send verification codes on the Spark plan — it answers
 *  auth/operation-not-allowed however the provider is configured. Rather than
 *  hold the whole signup flow hostage to a billing decision, one fixed code is
 *  accepted so the screens after it can be built and walked.
 *
 *  In its own file, with no imports, so it can be tested outside React Native.
 *  The risk this carries is being shipped by accident, and the guard against
 *  that is the thing worth pinning.
 */

// `__DEV__` is defined by the React Native bundler and by nothing else, so it
// has to be read defensively — reaching for it under plain node throws before
// any guard can run.
const isDev = typeof __DEV__ !== "undefined" && __DEV__ === true;

/** How the bypass is switched off: `EXPO_PUBLIC_PHONE_STUB=off` in `.env`.
 *
 *  Read through a literal `process.env.X` because Expo INLINES these at bundle
 *  time by matching the source text. `process.env[name]` is a lookup on an
 *  object that does not exist on the device, and it silently reads undefined. */
const flag = (process.env.EXPO_PUBLIC_PHONE_STUB ?? "").trim().toLowerCase();

/** The code that stands in for a real SMS, or null when there is none.
 *
 *  This used to be gated on `__DEV__` alone, which was the right instinct and
 *  the wrong mechanism: a release build for a device — the only way to run on
 *  a phone without Metro — has `__DEV__` false, so the bypass vanished and
 *  signup fell through to Firebase, which is not paid for and fails. The
 *  screens after it became unreachable on the one build that matters.
 *
 *  So the switch is explicit now rather than incidental. Until Firebase
 *  billing is on this is deliberately ON in every build, including release —
 *  ANYONE CAN PASS PHONE VERIFICATION WITH 123456. That is the agreed state
 *  for testing and it must not go to the store.
 *
 *  To turn it off, one line in `.env`:
 *
 *      EXPO_PUBLIC_PHONE_STUB=off
 *
 *  It needs a rebuild, not a reload, because the value is inlined.
 *
 *  What keeps it visible in the meantime: the code screen prints a banner
 *  while it is active, and `sendCode` logs a line every time it stands in. A
 *  bypass you cannot see is how one ships. */
export const STUB_CODE: string | null = flag === "off" ? null : "123456";

export const usingStub = (): boolean => STUB_CODE != null;

/** True when the bypass is live in a build that is NOT a development one —
 *  the state that must never reach the store. The code screen says so out
 *  loud, because "development build" is a comforting and wrong label for it. */
export const stubInReleaseBuild = (): boolean => usingStub() && !isDev;

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

/** How the bypass is switched ON for a test build: `EXPO_PUBLIC_PHONE_STUB=on`.
 *
 *  Read through a literal `process.env.X` because Expo INLINES these at bundle
 *  time by matching the source text. `process.env[name]` is a lookup on an
 *  object that does not exist on the device, and it silently reads undefined. */
const flag = (process.env.EXPO_PUBLIC_PHONE_STUB ?? "").trim().toLowerCase();

/** Which EAS profile built this bundle — set per profile in eas.json. A
 *  `production` bundle is the one that goes to the store. */
const profile = (process.env.EXPO_PUBLIC_BUILD_PROFILE ?? "").trim().toLowerCase();

/** The code that stands in for a real SMS, or null when there is none.
 *
 *  History, because the direction of this switch is the whole point. It was
 *  first gated on `__DEV__` alone, which broke device test builds (no Metro,
 *  `__DEV__` false, Firebase not paid for). The fix made it ON in every build
 *  unless someone remembered to write `off` — so a release build accepted
 *  123456 from anyone, and nothing but memory stood between that and the
 *  store. GM001-66 flagged it.
 *
 *  Now it is OFF unless asked for, and it cannot be asked for in a store
 *  build:
 *
 *    - a development build (Metro, `__DEV__`) has it, as before
 *    - an internal test build has it only with `EXPO_PUBLIC_PHONE_STUB=on`
 *      (the `preview` profile in eas.json sets that)
 *    - a `production` profile build never has it, whatever the flag says
 *
 *  It needs a rebuild, not a reload, because the values are inlined. The code
 *  screen still prints a banner while it is active, and `sendCode` logs every
 *  time it stands in. */
export function stubCodeFor(a: { isDev: boolean; flag: string; profile: string }): string | null {
  if (a.profile === "production") return null;
  if (a.flag === "off") return null;
  if (a.isDev || a.flag === "on") return "123456";
  return null;
}

export const STUB_CODE: string | null = stubCodeFor({ isDev, flag, profile });

export const usingStub = (): boolean => STUB_CODE != null;

/** True when the bypass is live in a build that is NOT a development one —
 *  the state that must never reach the store. The code screen says so out
 *  loud, because "development build" is a comforting and wrong label for it. */
export const stubInReleaseBuild = (): boolean => usingStub() && !isDev;

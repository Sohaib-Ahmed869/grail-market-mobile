/** The development stand-in for SMS verification.
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

/** The code that stands in for a real SMS, or null when there is none.
 *
 *  Set to null once Firebase billing is on. Two things make that hard to
 *  forget: this cannot be non-null in a release build, and the code screen
 *  prints a banner while it is active. A bypass you cannot see is how one
 *  ships. */
export const STUB_CODE: string | null = isDev ? "123456" : null;

export const usingStub = (): boolean => STUB_CODE != null;

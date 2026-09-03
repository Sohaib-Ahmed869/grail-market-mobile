import { Platform } from "react-native";
import { apiMessage, get, post } from "./api";
import { leaveGuest } from "./guest";
import { saveSession, type Session } from "./session";

// Signing in with Google or Apple.
//
// Both native modules are require()d inside the function that needs them,
// never at module scope. expo-router imports every route file at startup, so
// a module-scope import of something that does not exist in this build takes
// the whole app down before anything renders — which has already happened
// twice here, with expo-notifications and the identity SDK.
//
// The app never sees a password and never sees an access token. It gets an
// identity token from the provider and hands it straight to our server, which
// checks the signature, the issuer, the audience and the expiry before it
// believes a word of it.

export type SocialResult =
  | { ok: true; session: Session; created: boolean }
  | { ok: false; message: string }
  /** The person backed out of the provider's sheet. Not a failure, and not
   *  something to put a red toast on screen for. */
  | { ok: "cancelled" };

export type Methods = { password: boolean; google: boolean; apple: boolean };

/** What this server can actually offer. Asked before the buttons are drawn:
 *  a Google button on a build with no client id is a button that fails after
 *  the person has already left the app. */
export async function authMethods(): Promise<Methods> {
  try {
    const r = await get<Partial<Methods>>("/auth/methods");
    return { password: true, google: Boolean(r.google), apple: Boolean(r.apple) };
  } catch {
    return { password: true, google: false, apple: false };
  }
}

async function exchange(
  provider: "google" | "apple", idToken: string, name?: string | null,
): Promise<SocialResult> {
  try {
    const r = await post<{
      token?: string; created?: boolean; error?: string; message?: string;
      user?: { user_id: string; name: string; email: string; avatar?: string | null };
    }>("/auth/oauth", { provider, idToken, name: name ?? undefined });

    if (!r.token || !r.user) {
      return { ok: false, message: r.message ?? "That sign-in didn't work." };
    }
    const session: Session = {
      token: r.token, userId: r.user.user_id, name: r.user.name,
      email: r.user.email, avatar: r.user.avatar ?? null,
    };
    await saveSession(session);
    leaveGuest();
    return { ok: true, session, created: Boolean(r.created) };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "signing in") };
  }
}

// ---- Apple ------------------------------------------------------------------

export function appleAvailableSync(): boolean {
  return Platform.OS === "ios";
}

export async function signInWithApple(): Promise<SocialResult> {
  if (Platform.OS !== "ios") return { ok: false, message: "Apple sign-in is iOS only." };
  let A: typeof import("expo-apple-authentication");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    A = require("expo-apple-authentication");
  } catch {
    return { ok: false, message: "This build doesn't support Apple sign-in yet." };
  }

  try {
    if (!(await A.isAvailableAsync())) {
      return { ok: false, message: "Apple sign-in isn't available on this device." };
    }
    const cred = await A.signInAsync({
      requestedScopes: [
        A.AppleAuthenticationScope.FULL_NAME,
        A.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!cred.identityToken) return { ok: false, message: "Apple didn't return a token." };

    // Apple sends the name exactly once, on the first authorisation, and not
    // in the token. Miss it and it can never be asked for again — so it is
    // passed through here and the server only uses it if it has nothing else.
    const name = [cred.fullName?.givenName, cred.fullName?.familyName]
      .filter(Boolean).join(" ").trim() || null;
    return exchange("apple", cred.identityToken, name);
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED" || e?.code === "ERR_CANCELED") {
      return { ok: "cancelled" };
    }
    return { ok: false, message: "Apple sign-in didn't complete." };
  }
}

// ---- Google -----------------------------------------------------------------

/** The client id for whichever platform is asking.
 *
 *  Google issues a separate one per platform and rejects a token whose
 *  audience does not match the client that asked for it — so this cannot be
 *  one value shared across all three. */
function googleClientId(): string | null {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === "ios") return ios ?? web ?? null;
  if (Platform.OS === "android") return android ?? web ?? null;
  return web ?? null;
}

export const googleConfigured = () => Boolean(googleClientId());

export async function signInWithGoogle(): Promise<SocialResult> {
  const clientId = googleClientId();
  if (!clientId) return { ok: false, message: "Google sign-in isn't set up in this build." };

  let AuthSession: typeof import("expo-auth-session");
  let WebBrowser: typeof import("expo-web-browser");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AuthSession = require("expo-auth-session");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebBrowser = require("expo-web-browser");
  } catch {
    return { ok: false, message: "This build doesn't support Google sign-in yet." };
  }

  try {
    // Closes the browser tab left behind when the redirect comes back.
    WebBrowser.maybeCompleteAuthSession?.();

    const redirectUri = AuthSession.makeRedirectUri({ scheme: "grailmarket" });
    const discovery = {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
    };

    // The implicit id_token flow. We want identity, not access to anything —
    // asking for a code and exchanging it would mean holding a client secret
    // in the app, which is a secret in a bundle, which is not a secret.
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "email", "profile"],
      extraParams: { nonce: await nonce() },
    });

    const result = await request.promptAsync(discovery);
    if (result.type === "cancel" || result.type === "dismiss") return { ok: "cancelled" };
    if (result.type !== "success") return { ok: false, message: "Google sign-in didn't complete." };

    const idToken = (result.params as Record<string, string>)?.id_token;
    if (!idToken) return { ok: false, message: "Google didn't return a token." };
    return exchange("google", idToken);
  } catch {
    return { ok: false, message: "Google sign-in didn't complete." };
  }
}

/** A fresh random value tying the response to this request. */
async function nonce(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");
    const bytes = Crypto.getRandomBytes(16);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Never block a sign-in on the nonce being pretty. It is replay protection
    // on a token that is also bound by audience and expiry.
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e12).toString(36)}`;
  }
}

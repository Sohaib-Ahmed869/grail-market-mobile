import { apiMessage, post } from "./api";
import { clearSession, getSession, saveSession, type Session } from "./session";
import { leaveGuest } from "./guest";

type AuthOut =
  | { token: string; user: { user_id: string; name: string; email: string; avatar?: string | null } }
  | { mfa: "required"; challenge: string; message?: string }
  | { error: string; message?: string };

export type AuthResult =
  | { ok: true; session: Session }
  /** The password was right and there is a second step. The challenge is
   *  short-lived and carries the fact that the password was checked, so the
   *  code screen never has to hold the password. */
  | { ok: "mfa"; challenge: string }
  | { ok: false; message: string };

async function complete(r: AuthOut): Promise<AuthResult> {
  if ("error" in r) {
    return { ok: false, message: r.message ?? "That didn't work. Try again." };
  }
  if ("mfa" in r) return { ok: "mfa", challenge: r.challenge };
  const session: Session = {
    token: r.token, userId: r.user.user_id, name: r.user.name, email: r.user.email,
    avatar: (r.user as any).avatar ?? null,
  };
  await saveSession(session);
  leaveGuest();
  return { ok: true, session };
}

export async function register(u: {
  email: string; name: string; phone: string; password: string;
}): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/register", u));
  } catch (e) {
    return { ok: false, message: apiMessage(e, "creating an account") };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/login", { email, password }));
  } catch (e) {
    // Never "check your connection" for a server that answered. A 404 here
    // means the app is pointed at a build without /auth — which is what this
    // message hid for an entire afternoon.
    return { ok: false, message: apiMessage(e, "signing in") };
  }
}

/** Step two of signing in: a code from the authenticator, or a recovery code. */
export async function loginMfa(challenge: string, code: string): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/login/mfa", { challenge, code }));
  } catch (e) {
    return { ok: false, message: apiMessage(e, "checking your code") };
  }
}

// ---- forgotten passwords ----------------------------------------------------

/** Always reports success. The server answers the same whether or not the
 *  address is registered, and repeating that here keeps the screen honest —
 *  there is nothing for it to reveal. */
export async function forgotPassword(email: string): Promise<string> {
  try {
    const r = await post<{ message?: string }>("/auth/forgot", { email });
    return r.message ?? "If that address has an account, a reset link is on its way.";
  } catch {
    return "If that address has an account, a reset link is on its way.";
  }
}

export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/reset", { token, password }));
  } catch (e) {
    return { ok: false, message: apiMessage(e, "resetting your password") };
  }
}

// ---- account settings -------------------------------------------------------

export async function changePassword(
  current: string, next: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await post<{ ok?: boolean; error?: string; message?: string }>(
      "/auth/password", { current, next },
    );
    return r.error ? { ok: false, message: r.message } : { ok: true };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "changing your password") };
  }
}

export async function updateProfile(
  patch: { name?: string; phone?: string | null },
): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await post<{ user?: { name: string }; error?: string; message?: string }>(
      "/auth/profile", patch,
    );
    if (r.error || !r.user) return { ok: false, message: r.message ?? "Check your details." };
    const sess = getSession();
    if (sess) await saveSession({ ...sess, name: r.user.name });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "saving your details") };
  }
}

// ---- two-step verification --------------------------------------------------

export async function startMfa(): Promise<
  { ok: true; secret: string; otpauth: string } | { ok: false; message: string }
> {
  try {
    const r = await post<{ secret?: string; otpauth?: string; error?: string; message?: string }>(
      "/auth/mfa/start", {},
    );
    if (!r.secret || !r.otpauth) return { ok: false, message: r.message ?? "Try again." };
    return { ok: true, secret: r.secret, otpauth: r.otpauth };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "setting up two-step") };
  }
}

/** Returns the recovery codes, which are shown once and never again — the
 *  server keeps only their digests. */
export async function confirmMfa(
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; message: string }> {
  try {
    const r = await post<{ ok?: boolean; recoveryCodes?: string[]; message?: string }>(
      "/auth/mfa/confirm", { code },
    );
    if (!r.ok || !r.recoveryCodes) return { ok: false, message: r.message ?? "That code isn't right." };
    return { ok: true, recoveryCodes: r.recoveryCodes };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "turning on two-step") };
  }
}

export async function disableMfa(password: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await post<{ ok?: boolean; error?: string; message?: string }>(
      "/auth/mfa/off", { password },
    );
    return r.error ? { ok: false, message: r.message } : { ok: true };
  } catch (e) {
    return { ok: false, message: apiMessage(e, "turning off two-step") };
  }
}

/** Change your face. The key is one of AVATARS; the server caps the length
 *  but does not know the list, because the artwork lives in the app. */
export async function chooseAvatar(avatar: string | null): Promise<boolean> {
  try {
    const r = await post<{ avatar?: string | null; error?: string }>("/auth/avatar", { avatar });
    if (r.error) return false;
    const s = getSession();
    if (s) await saveSession({ ...s, avatar: avatar ?? null });
    return true;
  } catch { return false; }
}

export const signOut = clearSession;

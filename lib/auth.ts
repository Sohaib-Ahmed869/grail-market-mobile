import { apiMessage, post } from "./api";
import { clearSession, getSession, saveSession, type Session } from "./session";
import { leaveGuest } from "./guest";

type AuthOut =
  | { token: string; user: { user_id: string; name: string; email: string; avatar?: string | null } }
  | { error: string; message?: string };

export type AuthResult = { ok: true; session: Session } | { ok: false; message: string };

async function complete(r: AuthOut): Promise<AuthResult> {
  if ("error" in r) {
    return { ok: false, message: r.message ?? "That didn't work. Try again." };
  }
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

import { post } from "./api";
import { clearSession, saveSession, type Session } from "./session";

type AuthOut =
  | { token: string; user: { user_id: string; name: string; email: string } }
  | { error: string; message?: string };

export type AuthResult = { ok: true; session: Session } | { ok: false; message: string };

async function complete(r: AuthOut): Promise<AuthResult> {
  if ("error" in r) {
    return { ok: false, message: r.message ?? "That didn't work. Try again." };
  }
  const session: Session = {
    token: r.token, userId: r.user.user_id, name: r.user.name, email: r.user.email,
  };
  await saveSession(session);
  return { ok: true, session };
}

export async function register(u: {
  email: string; name: string; phone: string; password: string;
}): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/register", u));
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection." };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    return await complete(await post<AuthOut>("/auth/login", { email, password }));
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection." };
  }
}

export const signOut = clearSession;

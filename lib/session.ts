import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// The signed-in member, and the token that proves it.
//
// SecureStore, not AsyncStorage: this is a bearer token, and anything holding
// it can act as the member. On iOS that means the keychain, which survives
// reinstall-free app updates and is encrypted at rest.
//
// SecureStore does not exist on web — there is no keychain in a browser — and
// calling it there THROWS. That throw was landing in the sign-in catch, which
// reported "couldn't reach the server" about a login that had already come
// back 201. Web falls back to localStorage: not a keychain, but the browser's
// own origin-scoped storage, which is what a web app has.

const KEY = "grailmarket.session";
const web = Platform.OS === "web";

const store = {
  async get(): Promise<string | null> {
    if (web) return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(v: string): Promise<void> {
    if (web) { globalThis.localStorage?.setItem(KEY, v); return; }
    await SecureStore.setItemAsync(KEY, v);
  },
  async del(): Promise<void> {
    if (web) { globalThis.localStorage?.removeItem(KEY); return; }
    await SecureStore.deleteItemAsync(KEY);
  },
};

export type Session = {
  token: string; userId: string; name: string; email: string;
  avatar?: string | null;
};

let current: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

const publish = (s: Session | null) => {
  current = s;
  listeners.forEach((l) => l(s));
};

export const getSession = () => current;
export const onSession = (fn: (s: Session | null) => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await store.get();
    publish(raw ? (JSON.parse(raw) as Session) : null);
  } catch {
    publish(null);
  }
  return current;
}

export async function saveSession(s: Session): Promise<void> {
  await store.set(JSON.stringify(s));
  publish(s);
}

export async function clearSession(): Promise<void> {
  await store.del().catch(() => {});
  publish(null);
}

/** The header every authenticated call needs. */
export const authHeader = (): Record<string, string> =>
  current ? { Authorization: `Bearer ${current.token}` } : {};

// --- react binding -----------------------------------------------------------
import { useEffect, useState } from "react";

/** The signed-in member, or null.
 *
 *  Subscribes rather than reading once, so signing in or out moves every
 *  screen at the same moment instead of whichever happens to remount. */
export function useSession(): Session | null {
  const [s, setS] = useState<Session | null>(current);
  useEffect(() => onSession(setS), []);
  return s;
}

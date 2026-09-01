import * as SecureStore from "expo-secure-store";

// The signed-in member, and the token that proves it.
//
// SecureStore, not AsyncStorage: this is a bearer token, and anything holding
// it can act as the member. On iOS that means the keychain, which survives
// reinstall-free app updates and is encrypted at rest.

const KEY = "grailmarket.session";

export type Session = { token: string; userId: string; name: string; email: string };

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
    const raw = await SecureStore.getItemAsync(KEY);
    publish(raw ? (JSON.parse(raw) as Session) : null);
  } catch {
    publish(null);
  }
  return current;
}

export async function saveSession(s: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  publish(s);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
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

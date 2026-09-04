import { get, post } from "./api";

export type Note = {
  notification_id: string; kind: string; title: string;
  body: string | null; href: string | null;
  actor_id: string | null; actor_name: string | null; actor_avatar: string | null;
  read_at: string | null; created_at: string;
};

export async function notifications(): Promise<{ items: Note[]; unread: number }> {
  try { return await get("/notifications"); }
  catch { return { items: [], unread: 0 }; }
}

export async function unreadNotifications(): Promise<number> {
  try { return (await get<{ unread: number }>("/notifications/unread")).unread ?? 0; }
  catch { return 0; }
}

export const markNotificationsRead = () => post<{ ok: boolean }>("/notifications/read", {});

/** Which kinds may push, and which of them this member has silenced.
 *
 *  The list of kinds comes from the server rather than from a copy here: it is
 *  derived there from the one table that decides what is worth interrupting
 *  somebody for, and a second list in the app is a list that goes stale the
 *  first time a kind is added. */
export async function notificationPrefs(): Promise<{ kinds: string[]; muted: string[] }> {
  try {
    const r = await get<{ kinds?: string[]; muted?: string[] }>("/notifications/prefs");
    return { kinds: r.kinds ?? [], muted: r.muted ?? [] };
  } catch {
    return { kinds: [], muted: [] };
  }
}

/** `push` is what the switch says, not how it is stored — on means send it. */
export const setNotificationPref = (kind: string, push: boolean) =>
  post<{ muted?: string[]; error?: string; message?: string }>(
    "/notifications/prefs", { kind, push },
  );

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

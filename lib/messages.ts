import { get, post } from "./api";

// Buyer and seller, about one card.

export type Thread = {
  thread_id: string; listing_id: string; buyer_id: string; seller_id: string;
  card_name: string; set_name: string | null; grader: string | null; grade: string | null;
  price: string | number; listing_status: string;
  image_url: string | null; photos: { angle: string; url: string }[] | null;
  other_id: string; other_name: string | null; other_avatar: string | null;
  my_role: "buyer" | "seller";
  last_body: string | null; unread: number; last_at: string;
};

export type Reaction = { emoji: string; userId: string };

export type Message = {
  message_id: string; thread_id: string; sender_id: string;
  body: string; kind: "text" | "event"; flags: string[];
  read_at: string | null; created_at: string;
  sender_name: string | null; sender_avatar: string | null;
  reactions: Reaction[];
};

/** The five. Enough for yes, no, thanks, that is funny, and deal. */
export const REACTIONS = ["👍", "👌", "🔥", "😂", "🤝"] as const;

export async function threads(): Promise<{ threads: Thread[]; unread: number }> {
  try { return await get("/messages"); }
  catch { return { threads: [], unread: 0 }; }
}

export async function unreadCount(): Promise<number> {
  try { return (await get<{ unread: number }>("/messages/unread")).unread ?? 0; }
  catch { return 0; }
}

export async function messagesIn(threadId: string): Promise<Message[]> {
  try {
    const r = await get<{ messages?: Message[] }>(`/messages/${encodeURIComponent(threadId)}`);
    return r.messages ?? [];
  } catch { return []; }
}

export const openThread = (listingId: string) =>
  post<{ threadId?: string; error?: string; message?: string }>("/messages/open", { listingId });

export const reactTo = (messageId: string, emoji: string | null) =>
  post<{ ok?: boolean; error?: string }>(
    `/messages/react/${encodeURIComponent(messageId)}`, { emoji });

export const sendMessage = (threadId: string, body: string) =>
  post<{ messageId?: string; masked?: boolean; notice?: string | null; error?: string }>(
    `/messages/${encodeURIComponent(threadId)}`, { body });

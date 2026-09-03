import { get, post } from "./api";

// The forum, from the app's side.
//
// Reading needs no account; voting, posting and replying do — the same line
// the market draws, for the same reason. Every write here returns the new
// state rather than assuming success, because a vote that looks applied and
// was not is worse than one that visibly failed.

export type Community = {
  community_id: string; slug: string; name: string;
  tagline: string | null; description: string | null;
  game: string | null; accent: string | null;
  members: number; posts: number; joined: boolean;
};

export type Reaction = { emoji: string; userId: string };

export type Post = {
  post_id: string; community_id: string; author_id: string;
  title: string; body: string | null; image_url: string | null;
  catalog_id: string | null; listing_id: string | null;
  score: number; comment_count: number; created_at: string;
  slug: string; community_name: string; accent: string | null;
  author_name: string | null; author_avatar: string | null; my_vote: number;
  reactions: Reaction[];
};

export type Comment = {
  comment_id: string; post_id: string; parent_id: string | null;
  author_id: string; body: string; score: number; created_at: string;
  author_name: string | null; author_avatar: string | null; my_vote: number;
  reactions: Reaction[];
};

export async function communities(): Promise<Community[]> {
  try {
    const r = await get<{ communities: Community[] }>("/community");
    return r.communities ?? [];
  } catch { return []; }
}

export async function feed(slug?: string | null, sort: string = "hot"): Promise<Post[]> {
  const q = new URLSearchParams({ sort });
  if (slug) q.set("slug", slug);
  try {
    const r = await get<{ posts: Post[] }>(`/community/feed?${q}`);
    return r.posts ?? [];
  } catch { return []; }
}

export async function thread(postId: string): Promise<{ post: Post; comments: Comment[] } | null> {
  try {
    const r = await get<{ post?: Post; comments?: Comment[]; error?: string }>(
      `/community/post/${encodeURIComponent(postId)}`,
    );
    return r.post ? { post: r.post, comments: r.comments ?? [] } : null;
  } catch { return null; }
}

export const write = (p: {
  slug: string; title: string; body?: string; imageUrl?: string | null;
  catalogId?: string | null; listingId?: string | null;
}) => post<{ postId?: string; masked?: boolean; notice?: string | null;
             error?: string; message?: string }>("/community/post", p);

export const reply = (postId: string, body: string, parentId?: string | null) =>
  post<{ commentId?: string; masked?: boolean; notice?: string | null;
         error?: string; message?: string }>(
    `/community/post/${encodeURIComponent(postId)}/comment`, { body, parentId });

/** Up, down, or take it back. The server returns the recomputed score. */
export const reactToPost = (kind: "post" | "comment", id: string, emoji: string | null) =>
  post<{ ok?: boolean; error?: string }>("/community/react", { kind, id, emoji });

export const castVote = (kind: "post" | "comment", id: string, value: 1 | 0 | -1) =>
  post<{ score?: number; value?: number; error?: string; message?: string }>(
    "/community/vote", { kind, id, value });

/** Make one. The slug is the address and cannot be changed afterwards, which
 *  is why the screen shows it while you type the name. */
export const makeCommunity = (c: {
  slug: string; name: string; tagline?: string; description?: string; accent?: string;
}) => post<{ slug?: string; error?: string; message?: string }>("/community", c);

/** A name, as an address. Reddit's rules: lower case, letters, digits, dash
 *  and underscore, nothing else — spaces and apostrophes become nothing
 *  rather than becoming %20. */
export const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 21);

export const joinCommunity = (slug: string, leave = false) =>
  post<{ joined?: boolean; error?: string; message?: string }>(
    `/community/${encodeURIComponent(slug)}/join`, { leave });

/** "4 hours ago", the way a forum says it. */
export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
}

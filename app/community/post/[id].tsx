import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../../components/Screen";
import { Txt } from "../../../components/Text";
import { Avatar } from "../../../components/Avatar";
import { Reactions } from "../../../components/Reactions";
import { Loader } from "../../../components/Loader";
import { Button } from "../../../components/Button";
import { ago, castVote, reactToPost, reply, thread, type Comment, type Post } from "../../../lib/community";
import { useSession } from "../../../lib/session";
import { colors, radius, space, type } from "../../../theme";

/** A post and its replies.
 *
 *  Replies are threaded one level deep and no further. Reddit's infinite
 *  nesting works on a wide screen with a mouse; on a phone the fourth level
 *  is eight characters wide. One level carries the thing that matters —
 *  which comment is being answered — and nothing past that. */
export default function PostPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();

  const [data, setData] = useState<{ post: Post; comments: Comment[] } | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    thread(String(id)).then((t) => { if (alive) setData(t); });
    return () => { alive = false; };
  }, [id]);
  useFocusEffect(load);

  if (data === undefined) return <Screen back><Loader fill label="Loading" /></Screen>;
  if (data === null) {
    return (
      <Screen back>
        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Feather name="alert-circle" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>Post Not Found</Txt>
        </View>
      </Screen>
    );
  }

  const { post, comments } = data;
  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const send = async () => {
    if (!session) return router.push("/signup");
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const r = await reply(post.post_id, body, replyTo?.comment_id ?? null);
    setBusy(false);
    if (r.error) return;
    setText(""); setReplyTo(null); load();
    if (r.masked && r.notice) Alert.alert("Contact details removed", r.notice);
  };

  return (
    <Screen
      back
      footer={
        <View>
          {replyTo && (
            <View style={s.replyingTo}>
              <Feather name="corner-down-right" size={13} color={colors.inkFaint} />
              <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1} style={{ flex: 1 }}>
                Replying to {replyTo.author_name ?? "member"}
              </Txt>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Feather name="x" size={14} color={colors.inkFaint} />
              </Pressable>
            </View>
          )}
          <View style={s.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={session ? "Add a comment" : "Sign in to comment"}
              placeholderTextColor={colors.inkFaint}
              multiline
              style={s.input}
              onFocus={() => { if (!session) router.push("/signup"); }}
            />
            <Pressable
              onPress={send}
              disabled={busy || !text.trim()}
              style={[s.send, (!text.trim() || busy) && { opacity: 0.4 }]}
            >
              <Feather name="arrow-up" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={s.meta}>
        <Pressable
          onPress={() => router.push({ pathname: "/community", params: { slug: post.slug } })}
          style={s.communityChip}
        >
          <View style={[s.dot, { backgroundColor: post.accent ?? colors.ink }]} />
          <Txt variant="overline" color={colors.ink}>{post.community_name}</Txt>
        </Pressable>
        <Avatar name={post.author_name ?? "member"} id={post.author_avatar} size={22} />
        <Txt variant="bodySmall" color={colors.inkFaint}>
          {post.author_name ?? "member"} · {ago(post.created_at)}
        </Txt>
      </View>

      <Txt variant="h1" style={{ marginTop: space.sm }}>{post.title}</Txt>
      {post.body && (
        <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.md }}>{post.body}</Txt>
      )}
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={s.image} resizeMode="cover" />
      )}

      <Votes
        kind="post" id={post.post_id} score={post.score} mine={post.my_vote}
        onNeedsAccount={() => router.push("/signup")}
        extra={`${post.comment_count} ${post.comment_count === 1 ? "comment" : "comments"}`}
      />

      <View style={{ marginTop: space.md }}>
        <Reactions
          reactions={post.reactions ?? []}
          mine={session?.userId}
          onPick={async (e) => {
            if (!session) return router.push("/signup");
            await reactToPost("post", post.post_id, e);
            load();
          }}
        />
      </View>

      <View style={s.rule} />

      {roots.length === 0 ? (
        <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginVertical: space.xl }}>
          No replies yet. Say the first thing.
        </Txt>
      ) : (
        <View style={{ gap: space.lg, marginTop: space.md }}>
          {roots.map((c) => (
            <View key={c.comment_id}>
              <CommentBlock
                comment={c}
                mine={session?.userId}
                onReply={() => (session ? setReplyTo(c) : router.push("/signup"))}
                onNeedsAccount={() => router.push("/signup")}
                onReact={async (e) => {
                  if (!session) return router.push("/signup");
                  await reactToPost("comment", c.comment_id, e);
                  load();
                }}
              />
              {childrenOf(c.comment_id).map((k) => (
                <View key={k.comment_id} style={s.child}>
                  <CommentBlock
                    comment={k}
                    mine={session?.userId}
                    onReply={() => (session ? setReplyTo(c) : router.push("/signup"))}
                    onNeedsAccount={() => router.push("/signup")}
                    onReact={async (e) => {
                      if (!session) return router.push("/signup");
                      await reactToPost("comment", k.comment_id, e);
                      load();
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function CommentBlock({
  comment, onReply, onNeedsAccount, onReact, mine,
}: {
  comment: Comment; onReply: () => void; onNeedsAccount: () => void;
  onReact: (emoji: string) => void; mine?: string | null;
}) {
  return (
    <View>
      <View style={s.byline}>
        <Avatar name={comment.author_name ?? "member"} id={comment.author_avatar} size={22} />
        <Txt variant="bodySmall" color={colors.inkFaint}>
          {comment.author_name ?? "member"} · {ago(comment.created_at)}
        </Txt>
      </View>
      <Txt variant="body" style={{ marginTop: 2 }}>{comment.body}</Txt>
      <Votes
        kind="comment" id={comment.comment_id} score={comment.score} mine={comment.my_vote}
        onNeedsAccount={onNeedsAccount}
        onReply={onReply}
        small
      />
      {(comment.reactions?.length ?? 0) > 0 || true ? (
        <View style={{ marginTop: 6 }}>
          <Reactions
            reactions={comment.reactions ?? []}
            mine={mine}
            onPick={onReact}
            compact
          />
        </View>
      ) : null}
    </View>
  );
}

/** The arrows, shared by posts and comments.
 *
 *  Optimistic: the number moves on tap and rolls back if the server refuses.
 *  A vote that costs a visible round trip feels broken even when it works. */
function Votes({
  kind, id, score, mine, onNeedsAccount, onReply, extra, small,
}: {
  kind: "post" | "comment"; id: string; score: number; mine: number;
  onNeedsAccount: () => void; onReply?: () => void; extra?: string; small?: boolean;
}) {
  const [v, setV] = useState(mine ?? 0);
  const [n, setN] = useState(score ?? 0);

  const cast = async (next: 1 | -1) => {
    const value = v === next ? 0 : next;
    const wasV = v, wasN = n;
    setV(value); setN(wasN - wasV + value);
    const r = await castVote(kind, id, value);
    if (r.error) {
      setV(wasV); setN(wasN);
      if (r.error === "unauthenticated") onNeedsAccount();
    } else if (typeof r.score === "number") setN(r.score);
  };

  const size = small ? 18 : 22;
  return (
    <View style={[s.votes, small && { marginTop: 4 }]}>
      <Pressable onPress={() => cast(1)} hitSlop={8} accessibilityLabel="Upvote">
        <Feather name="chevron-up" size={size} color={v === 1 ? colors.up : colors.inkFaint} />
      </Pressable>
      <Txt variant={small ? "bodySmall" : "h3"}
        color={v === 1 ? colors.up : v === -1 ? colors.down : colors.ink}>{n}</Txt>
      <Pressable onPress={() => cast(-1)} hitSlop={8} accessibilityLabel="Downvote">
        <Feather name="chevron-down" size={size} color={v === -1 ? colors.down : colors.inkFaint} />
      </Pressable>
      {onReply && (
        <Pressable onPress={onReply} hitSlop={8} style={s.replyBtn}>
          <Feather name="corner-down-right" size={13} color={colors.inkFaint} />
          <Txt variant="bodySmall" color={colors.inkFaint}>Reply</Txt>
        </Pressable>
      )}
      {extra && <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginLeft: space.sm }}>{extra}</Txt>}
    </View>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm, flexWrap: "wrap" },
  communityChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: space.sm, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSunk,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  byline: { flexDirection: "row", alignItems: "center", gap: 6 },
  image: {
    width: "100%", height: 260, borderRadius: radius.md, marginTop: space.md,
    backgroundColor: colors.surfaceSunk,
  },
  votes: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: space.md },
  rule: { height: 1, backgroundColor: colors.line, marginTop: space.lg },
  child: {
    marginTop: space.md, marginLeft: space.lg, paddingLeft: space.md,
    borderLeftWidth: 2, borderLeftColor: colors.line,
  },
  replyingTo: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.md, paddingVertical: 6, marginBottom: 6,
    borderRadius: radius.sm, backgroundColor: colors.surfaceSunk,
  },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: space.md, paddingTop: 12,
    ...type.body, color: colors.ink, textAlignVertical: "top",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  send: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.ink,
  },
});

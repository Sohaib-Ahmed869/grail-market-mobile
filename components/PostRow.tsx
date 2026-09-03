import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { Avatar } from "./Avatar";
import { ago, castVote, type Post } from "../lib/community";
import { colors, radius, space } from "../theme";

/** One post in a feed.
 *
 *  The vote control sits on the left in its own column, the way every forum
 *  has done it since the first one: the arrows are the most-used control on
 *  the screen and they never move, so the thumb learns where they are and
 *  stops reading.
 *
 *  Voting is optimistic. The count moves the instant it is tapped and rolls
 *  back if the server disagrees — a forum where each vote costs a visible
 *  round trip feels broken even when it is working. */
export function PostRow({
  post, onNeedsAccount, compact = false,
}: {
  post: Post; onNeedsAccount: () => void; compact?: boolean;
}) {
  const router = useRouter();
  const [vote, setVote] = useState<number>(post.my_vote ?? 0);
  const [score, setScore] = useState<number>(post.score ?? 0);

  const cast = async (next: 1 | -1) => {
    const value = vote === next ? 0 : next;      // tapping the same arrow undoes it
    const wasVote = vote, wasScore = score;
    setVote(value);
    setScore(wasScore - wasVote + value);
    const r = await castVote("post", post.post_id, value);
    if (r.error) {
      setVote(wasVote); setScore(wasScore);
      if (r.error === "unauthenticated") onNeedsAccount();
    } else if (typeof r.score === "number") {
      setScore(r.score);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.votes}>
        <Pressable onPress={() => cast(1)} hitSlop={8} accessibilityLabel="Upvote">
          <Feather name="chevron-up" size={22} color={vote === 1 ? colors.up : colors.inkFaint} />
        </Pressable>
        <Txt variant="h3" color={vote === 1 ? colors.up : vote === -1 ? colors.down : colors.ink}>
          {score}
        </Txt>
        <Pressable onPress={() => cast(-1)} hitSlop={8} accessibilityLabel="Downvote">
          <Feather name="chevron-down" size={22} color={vote === -1 ? colors.down : colors.inkFaint} />
        </Pressable>
      </View>

      <Pressable
        style={{ flex: 1 }}
        onPress={() => router.push(`/community/post/${post.post_id}` as any)}
      >
        <View style={s.meta}>
          <Avatar name={post.author_name ?? "member"} id={(post as any).author_avatar} size={20} />
          <View style={[s.dot, { backgroundColor: post.accent ?? colors.ink }]} />
          <Txt variant="overline" color={colors.inkMuted}>{post.community_name}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            · {post.author_name ?? "member"} · {ago(post.created_at)}
          </Txt>
        </View>

        <Txt variant="h3" style={{ marginTop: 3 }} numberOfLines={compact ? 2 : 3}>
          {post.title}
        </Txt>

        {post.body && !compact && (
          <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={2} style={{ marginTop: 2 }}>
            {post.body}
          </Txt>
        )}

        {post.image_url && !compact && (
          <Image source={{ uri: post.image_url }} style={s.image} resizeMode="cover" />
        )}

        <View style={s.foot}>
          <Feather name="message-square" size={13} color={colors.inkFaint} />
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
          </Txt>
          {/* what people reacted with, read-only here: the picker belongs on
              the post itself, where there is room to aim at it */}
          {(post.reactions ?? []).length > 0 && (
            <View style={s.reacts}>
              {[...new Set(post.reactions.map((r) => r.emoji))].slice(0, 3).map((e) => (
                <Txt key={e} variant="bodySmall">{e}</Txt>
              ))}
              <Txt variant="bodySmall" color={colors.inkFaint}>{post.reactions.length}</Txt>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row", gap: space.md, padding: space.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  votes: { alignItems: "center", gap: 1, width: 34, paddingTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  image: {
    width: "100%", height: 180, borderRadius: radius.md, marginTop: space.sm,
    backgroundColor: colors.surfaceSunk,
  },
  foot: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: space.sm },
  reacts: {
    flexDirection: "row", alignItems: "center", gap: 2, marginLeft: space.sm,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: colors.surfaceSunk,
  },
});

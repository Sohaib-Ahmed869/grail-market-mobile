import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Avatar } from "../../components/Avatar";
import { GraderBadge } from "../../components/GraderChips";
import { SkeletonList, SkeletonRow } from "../../components/Skeleton";
import { threads as fetchThreads, type Thread } from "../../lib/messages";
import { ago } from "../../lib/community";
import { colors, radius, space } from "../../theme";

/** Every conversation, newest first.
 *
 *  One row per card rather than per person: two people who have traded twice
 *  have two threads, and neither has to scroll past the other deal to find
 *  what was agreed on this one. */
export default function Messages() {
  const router = useRouter();
  const [rows, setRows] = useState<Thread[] | undefined>(undefined);

  const load = useCallback(() => {
    let alive = true;
    const pull = () => fetchThreads().then((r) => { if (alive) setRows(r.threads); });
    pull();
    // Five seconds, not three: this is a list of conversations, and the cost
    // of it being a few seconds stale is nil compared with the open one.
    const timer = setInterval(() => {
      if (AppState.currentState === "active") pull();
    }, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  useFocusEffect(load);

  return (
    <Screen back>
      <Txt variant="display" style={{ marginTop: space.sm }}>Messages</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        With buyers and sellers, about a specific card.
      </Txt>

      {rows === undefined ? (
        <View style={{ marginTop: space.xl }}>
          <SkeletonList count={3}>{() => <SkeletonRow />}</SkeletonList>
        </View>
      ) : rows.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Feather name="message-circle" size={20} color={colors.inkFaint} />
          </View>
          <Txt variant="h3" center style={{ marginTop: space.md }}>No Conversations</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Making an offer or tapping Message on a listing starts one. Community talk
            lives in its own tab — this is only about deals.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.sm, marginTop: space.xl }}>
          {rows.map((t) => {
            const img = t.photos?.[0]?.url ?? t.image_url;
            return (
              <Pressable
                key={t.thread_id}
                onPress={() => router.push(`/messages/${t.thread_id}` as any)}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
              >
                <View>
                  {img ? (
                    <Image source={{ uri: img }} style={s.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.thumb, s.thumbEmpty]}>
                      <Feather name="image" size={14} color={colors.inkFaint} />
                    </View>
                  )}
                  <View style={s.face}>
                    <Avatar name={t.other_name ?? "member"} id={t.other_avatar} size={24} ring />
                  </View>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.head}>
                    <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                      {t.other_name ?? "Member"}
                    </Txt>
                    <Txt variant="bodySmall" color={colors.inkFaint}>{ago(t.last_at)}</Txt>
                  </View>
                  <View style={s.cardLine}>
                    <GraderBadge grader={t.grader ?? "RAW"} grade={t.grade} />
                    <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1} style={{ flex: 1 }}>
                      {t.card_name}
                    </Txt>
                  </View>
                  <Txt
                    variant="bodySmall"
                    color={t.unread > 0 ? colors.ink : colors.inkFaint}
                    numberOfLines={1}
                  >
                    {t.last_body ?? "No messages yet"}
                  </Txt>
                </View>

                {t.unread > 0 && (
                  <View style={s.badge}>
                    <Txt variant="overline" color={colors.onPrimary} style={{ fontSize: 10 }}>
                      {t.unread}
                    </Txt>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  thumb: { width: 46, height: 62, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  face: { position: "absolute", bottom: -6, right: -8 },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  cardLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.ink,
  },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
});

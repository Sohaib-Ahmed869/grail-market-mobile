import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Icon, type IconName } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { SkeletonList, SkeletonRow } from "../components/Skeleton";
import { markNotificationsRead, notifications, type Note } from "../lib/notifications";
import { ago } from "../lib/community";
import { colors, radius, space } from "../theme";

const LOOK: Record<string, { icon: IconName; tint: string; wash: string }> = {
  offer:          { icon: "offer",    tint: colors.accent, wash: colors.accentWash },
  "offer-settled":{ icon: "sold",     tint: colors.up,     wash: colors.upWash },
  message:        { icon: "messages", tint: colors.info,   wash: colors.infoWash },
  listing:        { icon: "selling",  tint: colors.ink,    wash: colors.surfaceSunk },
  rating:         { icon: "star",     tint: colors.accent, wash: colors.accentWash },
  price:          { icon: "price",    tint: colors.up,     wash: colors.upWash },
};

/** What happened while you were away.
 *
 *  Unread rows are marked when the list opens, in the same request that
 *  returns them — a badge the client has to remember to clear is a badge that
 *  ends up disagreeing with the screen underneath it. */
export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<Note[] | undefined>(undefined);

  const load = useCallback(() => {
    let alive = true;
    notifications().then((r) => {
      if (!alive) return;
      setItems(r.items);
      if (r.unread > 0) markNotificationsRead().catch(() => {});
    });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  return (
    <Screen back>
      <Txt variant="display" style={{ marginTop: space.sm }}>Notifications</Txt>

      {items === undefined ? (
        <View style={{ marginTop: space.xl }}>
          <SkeletonList count={4}>{() => <SkeletonRow />}</SkeletonList>
        </View>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Icon name="notify" size={22} color={colors.inkFaint} />
          </View>
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing Yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Offers, messages, price moves on cards you follow and decisions on your
            listings all land here.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.sm, marginTop: space.xl }}>
          {items.map((n) => {
            const look = LOOK[n.kind] ?? LOOK.listing;
            const unread = !n.read_at;
            return (
              <Pressable
                key={n.notification_id}
                onPress={() => n.href && router.push(n.href as never)}
                style={({ pressed }) => [
                  s.row, unread && s.unread, pressed && { opacity: 0.75 },
                ]}
              >
                {n.actor_id ? (
                  <Avatar name={n.actor_name ?? "member"} id={n.actor_avatar} size={38} />
                ) : (
                  <View style={[s.icon, { backgroundColor: look.wash }]}>
                    <Icon name={look.icon} size={19} color={look.tint} filled />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="h3" numberOfLines={2}>{n.title}</Txt>
                  {n.body && (
                    <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={2}>
                      {n.body}
                    </Txt>
                  )}
                  <Txt variant="overline" color={colors.inkFaint}>{ago(n.created_at)}</Txt>
                </View>
                {unread && <View style={s.dot} />}
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
  unread: { borderColor: colors.lineStrong, backgroundColor: colors.surface },
  icon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
});

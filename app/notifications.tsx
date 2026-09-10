import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Icon, type IconName } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { SkeletonList, SkeletonRow } from "../components/Skeleton";
import { markNotificationsRead, notifications, type Note } from "../lib/notifications";
import { ago } from "../lib/community";
import { colors, radius, shadow, space, type } from "../theme";

/** What each kind looks like when there is no person behind it.
 *
 *  A notification about a card is not a notification about a person, and
 *  giving both a round grey avatar was how the list came to read as one
 *  undifferentiated column. Colour is doing work here: the eye finds the
 *  money before it finds the words. */
const LOOK: Record<string, { icon: IconName; tint: string; wash: string }> = {
  offer:           { icon: "offer",    tint: colors.accent, wash: colors.accentWash },
  "offer-settled": { icon: "sold",     tint: colors.up,     wash: colors.upWash },
  deal:            { icon: "sold",     tint: colors.up,     wash: colors.upWash },
  message:         { icon: "messages", tint: colors.info,   wash: colors.infoWash },
  listing:         { icon: "selling",  tint: colors.ink,    wash: colors.surfaceSunk },
  rating:          { icon: "star",     tint: colors.accent, wash: colors.accentWash },
  price:           { icon: "price",    tint: colors.up,     wash: colors.upWash },
  dispute:         { icon: "grade",    tint: colors.down,   wash: colors.downWash },
};

const DAY = 86_400_000;

/** What happened while you were away.
 *
 *  Two decisions shape this screen.
 *
 *  FIRST, opening the list marks it read — a badge the client has to remember
 *  to clear is a badge that disagrees with the screen under it. But the rows
 *  keep looking new for as long as you are standing here. Marking them read
 *  and then immediately greying them out means the one thing you came to find
 *  out — what is new — is destroyed by the act of looking. So the ids that
 *  were unread on arrival are held for this visit, and only a deliberate
 *  "Mark all read" or leaving and coming back clears the highlight.
 *
 *  SECOND, they are grouped by when. A flat column of forty rows is a log;
 *  Today / This week / Earlier is the shape a person actually reads, because
 *  the question is nearly always "what happened since I last looked".
 */
export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<Note[] | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  /** Unread when this visit began. Survives the read that opening performs. */
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const marking = useRef(false);

  const load = useCallback(() => {
    let alive = true;
    notifications().then((r) => {
      if (!alive) return;
      setItems(r.items);
      setUnread(r.unread);
      setFresh(new Set(r.items.filter((n) => !n.read_at).map((n) => n.notification_id)));
      if (r.unread > 0 && !marking.current) {
        marking.current = true;
        markNotificationsRead().catch(() => {}).finally(() => { marking.current = false; });
      }
    });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const refresh = useCallback(async () => {
    const r = await notifications();
    setItems(r.items);
    setUnread(r.unread);
  }, []);

  /** The button does what opening already did, and clears the highlight —
   *  which is the part a person can see, and therefore the part they mean. */
  const readAll = useCallback(async () => {
    setFresh(new Set());
    setUnread(0);
    await markNotificationsRead().catch(() => {});
  }, []);

  const groups = useMemo(() => group(items ?? []), [items]);
  const anyFresh = fresh.size > 0;

  return (
    <Screen onRefresh={refresh} back>
      <View style={s.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <Txt variant="display">Notifications</Txt>
            {unread > 0 && (
              <View style={s.count}>
                <Txt style={s.countTxt}>{unread > 99 ? "99+" : unread}</Txt>
              </View>
            )}
          </View>
          {anyFresh ? (
            <Pressable onPress={readAll} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Txt variant="label" color={colors.accent}>Mark all as read</Txt>
            </Pressable>
          ) : items && items.length > 0 ? (
            <Txt variant="bodySmall" color={colors.inkFaint}>You’re all caught up</Txt>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push("/alerts")}
          hitSlop={10}
          accessibilityLabel="Notification settings"
          style={({ pressed }) => [s.gear, pressed && { opacity: 0.7 }]}
        >
          <Icon name="settings" size={18} color={colors.ink} />
        </Pressable>
      </View>

      {items === undefined ? (
        <View style={{ marginTop: space.xl }}>
          <SkeletonList count={5}>{() => <SkeletonRow />}</SkeletonList>
        </View>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Icon name="notify" size={24} color={colors.inkFaint} />
          </View>
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing yet</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Offers, messages, price moves on cards you follow and decisions on your
            listings all land here.
          </Txt>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.title}>
            <Txt variant="overline" color={colors.inkFaint} style={s.groupHead}>{g.title}</Txt>
            <View style={{ gap: 6 }}>
              {g.rows.map((n) => (
                <Row
                  key={n.notification_id}
                  note={n}
                  fresh={fresh.has(n.notification_id)}
                  onPress={() => n.href && router.push(n.href as never)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function Row({ note: n, fresh, onPress }: { note: Note; fresh: boolean; onPress: () => void }) {
  const look = LOOK[n.kind] ?? LOOK.listing;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${fresh ? "Unread. " : ""}${n.title}. ${n.body ?? ""} ${ago(n.created_at)}`}
      style={({ pressed }) => [s.row, fresh && s.rowFresh, pressed && { opacity: 0.7 }]}
    >
      {n.actor_id ? (
        <Avatar name={n.actor_name ?? "member"} id={n.actor_avatar} size={44} />
      ) : (
        <View style={[s.icon, { backgroundColor: look.wash }]}>
          <Icon name={look.icon} size={20} color={look.tint} filled />
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Title and time on one line, the way a feed reads — the timestamp
            is a fact about the row, not a third line of its own. */}
        <Txt numberOfLines={2} style={s.title}>
          {n.title}
          <Txt style={s.when}>{"  "}{ago(n.created_at)}</Txt>
        </Txt>
        {n.body ? (
          <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={2} style={{ marginTop: 1 }}>
            {n.body}
          </Txt>
        ) : null}
      </View>

      {/* One dot, and only when it is new. A chevron on every row is a
          promise that every row goes somewhere, and some of them do not. */}
      {fresh ? <View style={s.dot} /> : null}
    </Pressable>
  );
}

/** Today, this week, earlier. Empty groups are not rendered. */
function group(items: Note[]): { title: string; rows: Note[] }[] {
  const now = Date.now();
  const buckets: Record<string, Note[]> = { Today: [], "This week": [], Earlier: [] };
  for (const n of items) {
    const age = now - new Date(n.created_at).getTime();
    const key = age < DAY ? "Today" : age < 7 * DAY ? "This week" : "Earlier";
    buckets[key]!.push(n);
  }
  return Object.entries(buckets)
    .filter(([, rows]) => rows.length > 0)
    .map(([title, rows]) => ({ title, rows }));
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.md, marginTop: space.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  count: {
    minWidth: 26, height: 24, borderRadius: 12, paddingHorizontal: 8,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.accent,
  },
  countTxt: { ...type.overline, fontSize: 12, color: colors.dark, fontVariant: ["tabular-nums"] },
  gear: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, ...shadow.card,
  },

  groupHead: { marginTop: space.xl, marginBottom: space.sm, marginLeft: 2 },

  // Flat by default: a read notification is a line in a list, not an object
  // that needs its own edges. Depth is reserved for the ones that are new.
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: "transparent",
  },
  rowFresh: { backgroundColor: colors.surface, ...shadow.card },

  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { ...type.body, color: colors.ink },
  when: { ...type.bodySmall, color: colors.inkFaint },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },

  empty: { alignItems: "center", marginTop: space.xxxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.field,
  },
});

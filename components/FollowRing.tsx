import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CardArt } from "./CardArt";
import { Icon } from "./Icon";
import { Txt } from "./Text";
import { colors, space } from "../theme";

export type Followed = {
  id: string;
  name: string;
  imageUrl?: string | null;
  /** Percent since you started following. Null when it has never been priced. */
  since?: number | null;
  /** An alert is set on this one. */
  alerting?: boolean;
};

const SIZE = 68;
const RING = 2.5;

/** The cards you follow, as a row of faces.
 *
 *  This was six tall cards you scrolled through one and a half at a time. A
 *  watchlist is a glance — "has anything I care about moved" — and answering
 *  a glance with a carousel means scrolling to find out.
 *
 *  So: the stories idiom. Seven at once, the picture cropped to the middle
 *  where the character is, and the ring carrying the answer. The ring is the
 *  whole point — colour is doing real work here rather than decorating, and
 *  it is why this can be small enough to fit seven.
 *
 *    gold    an alert is set and this is what you asked to be told about
 *    green   up since you followed it
 *    brick   down
 *    grey    not priced yet, which is a real state and not a zero
 */
export function FollowRing({
  items, onPress, onAdd,
}: {
  items: Followed[];
  onPress: (item: Followed) => void;
  onAdd?: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {onAdd && (
        <Pressable onPress={onAdd} style={s.item}>
          <View style={[s.ring, s.addRing]}>
            <View style={s.addInner}>
              <Icon name="watchlist" size={22} color={colors.inkMuted} />
            </View>
          </View>
          <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1} style={s.label}>
            Follow
          </Txt>
        </Pressable>
      )}

      {items.map((it) => {
        const priced = it.since != null;
        const up = (it.since ?? 0) >= 0;
        const colours: [string, string] = it.alerting
          ? ["#C4A97A", colors.accent]
          : !priced
            ? [colors.line, colors.lineStrong]
            : up
              ? ["#4FBF8B", colors.up]
              : ["#D3766B", colors.down];

        return (
          <Pressable
            key={it.id}
            onPress={() => onPress(it)}
            style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}
          >
            {/* The ring is a gradient, not a border. A flat stroke at this
                size reads as a hairline someone forgot to remove; a gradient
                reads as a deliberate mark. */}
            <LinearGradient
              colors={colours}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.ring}
            >
              {/* The white gap between ring and picture. Without it the ring
                  looks like a coloured edge ON the artwork rather than around
                  it, and busy card art swallows it entirely. */}
              <View style={s.gap}>
                <View style={s.art}>
                  <CardArt uri={it.imageUrl} iconSize={20} />
                </View>
              </View>
            </LinearGradient>

            {priced && (
              <View style={[s.move, { backgroundColor: up ? colors.up : colors.down }]}>
                <Txt variant="bodySmall" color={colors.onPrimary} style={s.moveTxt}>
                  {up ? "+" : "−"}{Math.abs(it.since!).toFixed(0)}%
                </Txt>
              </View>
            )}

            <Txt variant="bodySmall" numberOfLines={1} style={s.label}>{it.name}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { paddingHorizontal: space.xl, gap: space.md, paddingVertical: space.sm },
  item: { width: SIZE + 8, alignItems: "center" },
  ring: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    alignItems: "center", justifyContent: "center",
  },
  addRing: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.outline,
  },
  addInner: { alignItems: "center", justifyContent: "center" },
  gap: {
    width: SIZE - RING * 2, height: SIZE - RING * 2, borderRadius: (SIZE - RING * 2) / 2,
    backgroundColor: colors.washBottom,
    alignItems: "center", justifyContent: "center",
  },
  art: {
    width: SIZE - RING * 2 - 4, height: SIZE - RING * 2 - 4,
    borderRadius: (SIZE - RING * 2 - 4) / 2,
    overflow: "hidden", backgroundColor: colors.surfaceSunk,
  },
  move: {
    position: "absolute", top: SIZE - 16, right: 2,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.washBottom,
  },
  moveTxt: { fontSize: 10.5, fontVariant: ["tabular-nums"] },
  label: { marginTop: 6, width: "100%", textAlign: "center" },
});

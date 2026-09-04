import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CardArt } from "./CardArt";
import { FocusRail } from "./FocusRail";
import { Txt } from "./Text";
import { colors, radius, shadow, space } from "../theme";

export type Followed = {
  id: string;
  name: string;
  imageUrl?: string | null;
  /** Percent since you started following. Null when it has never been priced. */
  since?: number | null;
  /** An alert is set on this one. */
  alerting?: boolean;
};

const W = 96;
const H = Math.round((W * 495) / 360);
const RING = 2.5;

/** The cards you follow.
 *
 *  This was round faces, borrowed from stories, and the shape was the mistake.
 *  A face survives being cropped to a circle because a face IS roughly round —
 *  a trading card is a portrait rectangle whose border, name plate and art
 *  window are most of how you recognise it, and a 68pt circle keeps none of
 *  them. Six cards came out as six coloured blobs.
 *
 *  So the card keeps its own shape, and the two ideas worth keeping stay:
 *
 *  THE RING carries the answer, so colour does real work rather than
 *  decorating, and the tile can be small enough that several fit:
 *
 *    gold    an alert is set and this is what you asked to be told about
 *    green   up since you followed it
 *    brick   down
 *    grey    not priced yet, which is a real state and not a zero
 *
 *  THE FOCUS is the same rail the cards for sale use — the middle one is full
 *  size and lit, its neighbours are smaller and dimmer, and the list snaps.
 *  Scrolling is picking one rather than panning past all of them.
 */
export function FollowRing({
  items, onPress, onAdd,
}: {
  items: Followed[];
  onPress: (item: Followed) => void;
  onAdd?: () => void;
}) {
  // The add tile rides at the END. It is a snap position like any other, and
  // first would mean the rail opens focused on a button instead of on a card.
  const data: (Followed | "add")[] = onAdd ? [...items, "add"] : items;

  return (
    <FocusRail
      data={data}
      itemWidth={W}
      gap={space.lg}
      centreFirst={false}
      keyOf={(it, i) => (it === "add" ? "add" : it.id + i)}
      render={(it) =>
        it === "add" ? <AddTile onPress={onAdd!} /> : <Tile item={it} onPress={onPress} />
      }
    />
  );
}

function Tile({ item, onPress }: { item: Followed; onPress: (i: Followed) => void }) {
  const priced = item.since != null;
  const up = (item.since ?? 0) >= 0;
  const colours: [string, string] = item.alerting
    ? ["#C4A97A", colors.accent]
    : !priced
      ? [colors.outline, colors.lineStrong]
      : up
        ? ["#4FBF8B", colors.up]
        : ["#D3766B", colors.down];

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      {/* The ring is a gradient, not a border. A flat stroke at this size
          reads as a hairline somebody forgot to remove; a gradient reads as a
          deliberate mark. */}
      <LinearGradient
        colors={colours}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.ring}
      >
        {/* The page-coloured gap between ring and artwork. Without it the ring
            looks like a coloured edge ON the card rather than around it, and
            busy art swallows it entirely. */}
        <View style={s.gap}>
          <View style={s.art}>
            <CardArt uri={item.imageUrl} iconSize={20} />
          </View>
        </View>
      </LinearGradient>

      {item.alerting && (
        <View style={s.bell}>
          <MaterialCommunityIcons name="bell" size={11} color={colors.onPrimary} />
        </View>
      )}

      {priced && (
        <View style={[s.move, { backgroundColor: up ? colors.up : colors.down }]}>
          <Txt variant="bodySmall" color={colors.onPrimary} style={s.moveTxt}>
            {up ? "+" : "−"}{Math.abs(item.since!).toFixed(0)}%
          </Txt>
        </View>
      )}

      <Txt variant="bodySmall" numberOfLines={1} style={s.label}>{item.name}</Txt>
    </Pressable>
  );
}

/** Follow another one.
 *
 *  A plus. The telescope is what a card wears once you follow it, so putting
 *  one here would say "watching" on the single tile in the row with nothing in
 *  it — and this tile's whole job is to be the way to add one. Card-shaped and
 *  dashed, so it reads as the empty slot in a row of full ones.
 */
function AddTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <View style={[s.ring, s.addRing]}>
        <View style={s.addMark}>
          <MaterialCommunityIcons name="plus" size={21} color={colors.onPrimary} />
        </View>
      </View>
      <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1} style={s.label}>
        Follow more
      </Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  ring: {
    width: W, height: H, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    ...shadow.card,
  },
  addRing: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.outline,
    shadowOpacity: 0, elevation: 0,
  },
  // Filled, so the one actionable tile in a row of pictures is the one that
  // looks like a control rather than the one that looks emptiest.
  addMark: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.ink,
  },
  gap: {
    width: W - RING * 2, height: H - RING * 2, borderRadius: radius.md - 3,
    backgroundColor: colors.washBottom,
    alignItems: "center", justifyContent: "center",
  },
  art: {
    width: W - RING * 2 - 4, height: H - RING * 2 - 4,
    borderRadius: radius.md - 5,
    overflow: "hidden", backgroundColor: colors.surfaceSunk,
  },
  bell: {
    position: "absolute", top: -5, right: -5,
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 2, borderColor: colors.washBottom,
  },
  move: {
    position: "absolute", top: H - 13, alignSelf: "center",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
    borderWidth: 2, borderColor: colors.washBottom,
  },
  moveTxt: { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] },
  label: { marginTop: space.md, width: W, textAlign: "center" },
});

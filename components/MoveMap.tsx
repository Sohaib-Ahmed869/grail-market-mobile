import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Txt } from "./Text";
import { treemap } from "../lib/treemap";
import { colors, radius, space, type } from "../theme";

export type Mover = {
  label: string;
  change: number | null;
  cardId?: string | null;
};

/** What moved, as area and colour rather than as a list.
 *
 *  A rail of equal-sized cards can only say the order things are in. This says
 *  how big the move was and which way it went at the same time, which is the
 *  only two facts anybody wants from this section — and it makes the one that
 *  actually matters the biggest thing on the screen instead of the leftmost.
 *
 *  Brand colours, not a red/green heat scale. Green and brick are already what
 *  "up" and "down" mean everywhere else in the app, and introducing a second
 *  vocabulary for the same two ideas is how a product ends up with two of
 *  everything.
 */
export function MoveMap({
  movers, width, height = 208, onPress,
}: {
  movers: Mover[];
  width: number;
  height?: number;
  onPress?: (m: Mover) => void;
}) {
  const GAP = 4;

  const tiles = useMemo(
    // Area is the SIZE of the move, so a 12% fall is as prominent as a 12%
    // rise. Ranking by the signed number would bury every drop at the bottom,
    // and a drop is the one people most want to see.
    () => treemap(movers, (m) => Math.abs(m.change ?? 0), { x: 0, y: 0, w: width, h: height }),
    [movers, width, height],
  );

  if (!tiles.length) return null;

  // The strongest move sets the scale, so the palette always uses its full
  // range — a quiet week is not rendered as a wall of the palest tint.
  const peak = Math.max(...tiles.map((t) => Math.abs(t.item.change ?? 0)), 1);

  return (
    <View style={{ width, height }}>
      {tiles.map((t, i) => {
        const change = t.item.change ?? 0;
        const up = change >= 0;
        const weight = Math.min(1, Math.abs(change) / peak);
        // Three sizes, because a tile that cannot hold its text should not
        // pretend to. Judged on each dimension separately: a tall narrow tile
        // has plenty of room for a percentage on its own line, and a rule
        // based on width alone was hiding the number on the second-biggest
        // mover on the board.
        const showPct = t.w >= 74 && t.h >= 78;
        const showName = t.w >= 62 && t.h >= 40;

        return (
          <Animated.View
            key={`${t.item.label}-${i}`}
            entering={FadeIn.duration(320).delay(i * 45)}
            style={{ position: "absolute", left: t.x, top: t.y, width: t.w, height: t.h }}
          >
            <Pressable
              onPress={() => onPress?.(t.item)}
              style={({ pressed }) => [
                s.tile,
                {
                  margin: GAP / 2,
                  backgroundColor: tint(up, weight),
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              {showName ? (
                <Txt
                  variant="bodySmall"
                  color={weight > 0.45 ? colors.onDark : colors.ink}
                  numberOfLines={showPct ? 2 : 1}
                  style={s.name}
                >
                  {t.item.label}
                </Txt>
              ) : (
                // Too small for a word. It keeps its colour and stays
                // tappable — a truncated name in a 40pt box is noise, and
                // the tile's size is already the thing it is saying.
                <View />
              )}
              {showPct && (
                <Txt
                  style={[s.pct, { color: weight > 0.45 ? colors.onDark : up ? colors.up : colors.down }]}
                  numberOfLines={1}
                >
                  {up ? "+" : "−"}{Math.abs(change).toFixed(1)}%
                </Txt>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** The same two colours the rest of the app uses for up and down, mixed
 *  towards the page so a small move is pale and a large one is solid. */
function tint(up: boolean, weight: number): string {
  const [r, g, b] = up ? [44, 122, 91] : [174, 74, 64];
  // Never fully transparent: a tile has to be a tile even at 0.1% of the week.
  const a = 0.16 + weight * 0.84;
  return `rgba(${r},${g},${b},${a})`;
}

const s = StyleSheet.create({
  tile: {
    flex: 1, borderRadius: radius.md,
    padding: space.sm, justifyContent: "space-between",
    overflow: "hidden",
  },
  name: { fontWeight: "600" },
  pct: { ...type.h3, fontVariant: ["tabular-nums"] },
});

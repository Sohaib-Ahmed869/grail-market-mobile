import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { colors, space, type } from "../theme";

export type MoveRow = {
  label: string;
  meta?: string | null;
  change: number | null;
  cardId?: string | null;
};

const BAR = 84;

/** Price moves as bars growing out of a shared zero.
 *
 *  The treemap this replaced said magnitude and direction at once, but it did
 *  it by taking a card's name away — below about 62pt a tile could only be a
 *  colour. A list keeps every name, and the bar does the same two jobs.
 *
 *  Growing from a CENTRE line rather than from the left is what makes it work:
 *  a bar that always starts at the left edge needs its colour read before you
 *  know which way it went, and colour alone is the one channel some people
 *  cannot use. Here the direction is the geometry.
 */
export function MoveBars({
  rows, onPress, max,
}: {
  rows: MoveRow[];
  onPress?: (r: MoveRow) => void;
  /** Share a scale across lists, so the dashboard's top three are drawn at the
   *  same size they are on the full screen. Without it, three rows of a
   *  shortened list rescale to their own biggest and the same card looks like
   *  a different week. */
  max?: number;
}) {
  const peak = max ?? Math.max(...rows.map((r) => Math.abs(r.change ?? 0)), 1);

  return (
    <View>
      {rows.map((r, i) => {
        const change = r.change ?? 0;
        const up = change >= 0;
        // A floor, so a 0.1% move is still a mark rather than nothing at all.
        const len = Math.max(3, (Math.abs(change) / peak) * (BAR / 2));

        return (
          <Pressable
            key={`${r.label}-${i}`}
            onPress={() => onPress?.(r)}
            style={({ pressed }) => [s.row, i > 0 && s.divided, pressed && { opacity: 0.6 }]}
          >
            <View style={s.who}>
              <Txt variant="h3" numberOfLines={1}>{r.label}</Txt>
              {r.meta ? (
                <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                  {r.meta}
                </Txt>
              ) : null}
            </View>

            {/* An outlined track, not a bare bar. The border is the full
                range the week actually covered, so a short bar reads as "a
                small move against a big week" rather than just as a short
                bar — without it there is nothing to measure against and the
                length only means something next to the row above it. */}
            <View style={s.gauge}>
              <View style={s.zero} />
              <View
                style={[
                  s.bar,
                  up
                    ? { left: BAR / 2, width: len, backgroundColor: colors.up }
                    : { right: BAR / 2, width: len, backgroundColor: colors.down },
                ]}
              />
            </View>

            <Txt style={[s.pct, { color: up ? colors.up : colors.down }]}>
              {up ? "+" : "−"}{Math.abs(change).toFixed(1)}%
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  who: { flex: 1, gap: 1 },
  gauge: {
    width: BAR, height: 20, justifyContent: "center",
    borderRadius: 5, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surfaceSunk,
    overflow: "hidden",
  },
  // The line every bar is measured from. Faint, but it has to be visible or
  // the bars read as starting from wherever they happen to start.
  // The line every bar is measured from. It runs the full height of the
  // track so it reads as the track's midpoint rather than as a tick floating
  // beside the bars.
  zero: {
    position: "absolute", left: BAR / 2 - 0.5, top: 0, bottom: 0,
    width: 1, backgroundColor: colors.lineStrong,
  },
  bar: { position: "absolute", height: 12, borderRadius: 2 },
  // Tabular figures, or the decimal point wanders down the column and the
  // percentages stop lining up.
  pct: { ...type.button, fontVariant: ["tabular-nums"], width: 62, textAlign: "right" },
});

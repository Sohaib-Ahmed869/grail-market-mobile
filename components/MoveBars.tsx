import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { PeriodStrip, type Periods } from "./PeriodStrip";
import { MarketChart } from "./MarketChart";
import { colors, radius, space, type } from "../theme";

export type MoveRow = {
  label: string;
  meta?: string | null;
  change: number | null;
  cardId?: string | null;
  /** The other three windows. */
  periods?: Periods | null;
  /** The actual price history, oldest first. */
  spark?: number[] | null;
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
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <View style={s.top}>
            <View style={s.who}>
              <Txt variant="h3" numberOfLines={1}>{r.label}</Txt>
              {r.meta ? (
                <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                  {r.meta}
                </Txt>
              ) : null}
            </View>

            {/* The gauge stays in the row — it is the net result, read at a
                glance against the other rows. The line goes underneath, full
                width, because an axis and a price marker need room and a
                34pt sparkline squeezed beside a name can carry neither. */}
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
            </View>

            {r.spark && r.spark.length > 1 && (
              <View style={s.chartWrap}>
                <MarketChart
                  points={r.spark}
                  height={116}
                  label={`${r.spark.length} readings · high to low across the period`}
                />
              </View>
            )}

            {r.periods && <PeriodStrip periods={r.periods} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  // Each row is its own bordered card rather than a band between hairlines.
  // A rule only separates; an outline says the name, the gauge and the
  // percentage are one reading of one card, which is what a row here is.
  top: { flexDirection: "row", alignItems: "center", gap: space.md },
  row: {
    paddingVertical: space.md, paddingHorizontal: space.md, marginBottom: space.sm,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    // colors.outline, not colors.line. The card is white and the page behind
    // it is near-white, so the border has to separate it from both.
    borderWidth: 1.5, borderColor: colors.outline,
    // A little lift as well. Two nearly-white surfaces need more than a
    // stroke between them to read as one sitting on the other.
    shadowColor: "#0B1622", shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  pressed: { opacity: 0.75, borderColor: colors.ink },
  who: { flex: 1, gap: 1 },
  chartWrap: { marginTop: space.md },
  gauge: {
    width: BAR, height: 20, justifyContent: "center",
    borderRadius: 5, borderWidth: 1, borderColor: colors.lineStrong,
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

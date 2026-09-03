import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

export type Candle = {
  day: string; open: number; high: number; low: number; close: number; readings: number;
};

/** Candles, when the bars are really candles.
 *
 *  A candle is four claims: where a period opened, how high it got, how low,
 *  and where it closed. A bar built from a single daily price has all four
 *  equal and drawing it as a candle asserts three things nobody measured — so
 *  the server says whether its bars aggregate more than one reading, and this
 *  falls back to a line when they do not.
 *
 *  That is also why the range picker only offers what the history reaches
 *  into. A "1Y" button over eight days of data redraws the same eight days
 *  under a label that says a year.
 */
export function CandleChart({
  candles, ohlc, height = 180, ranges, range, onRange, note, ghosts,
}: {
  candles: Candle[];
  ohlc: boolean;
  /** The other cards, drawn behind as faint lines.
   *
   *  Candles are one card by definition — an open and a close belong to one
   *  thing, and six cards cannot share a body. The rest go behind as lines:
   *  they are what these candles happened AGAINST, which is the only reason
   *  to draw them at all. */
  ghosts?: number[][];
  height?: number;
  /** Bar sizes, with the words to put on them. They name the BAR — "Weekly" —
   *  not how far back the data goes, because the second is a claim the
   *  history has to be able to support and the first always is. */
  ranges?: { id: string; label: string }[];
  range?: string;
  onRange?: (r: string) => void;
  note?: string;
}) {
  const [width, setWidth] = useState(0);
  const PAD_R = 50;

  const geo = useMemo(() => {
    if (!width || !candles.length) return null;
    const w = width - PAD_R;
    const h = height;
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const span = max - min || Math.max(max * 0.08, 0.01);

    const slot = w / candles.length;
    // A body never wider than two thirds of its slot, so bars stay separate
    // things rather than a solid block.
    const body = Math.max(3, Math.min(slot * 0.62, 22));
    const y = (v: number) => 8 + (1 - (v - min) / span) * (h - 20);

    // Ghosts are rebased onto the candles' own scale: each starts where the
    // candles start and moves by its own percentages from there. In absolute
    // prices a 22-cent card and a 380-dollar one cannot share an axis.
    const base = candles[0]!.open;
    const ghostPaths = (ghosts ?? [])
      .filter((g) => g.length > 1 && g[0]! > 0)
      .map((g) => {
        const rel = g.map((v) => (v / g[0]!) * base);
        const step = w / (rel.length - 1);
        let d = `M0 ${y(rel[0]!).toFixed(1)}`;
        for (let i = 1; i < rel.length; i++) {
          const cx = (i - 1) * step + step / 2;
          d += ` C${cx.toFixed(1)} ${y(rel[i - 1]!).toFixed(1)}, ${cx.toFixed(1)} ${y(rel[i]!).toFixed(1)}, ${(i * step).toFixed(1)} ${y(rel[i]!).toFixed(1)}`;
        }
        return d;
      });

    return {
      w, h, min, max, slot, body, y, ghostPaths,
      rows: [max, (max + min) / 2, min].map((v) => ({ v, y: y(v) })),
      bars: candles.map((c, i) => ({
        c,
        x: i * slot + slot / 2,
        up: c.close >= c.open,
        // A doji — open and close equal — has no body at all, so it is drawn
        // as a hairline instead of vanishing.
        top: y(Math.max(c.open, c.close)),
        bottom: y(Math.min(c.open, c.close)),
        high: y(c.high),
        low: y(c.low),
      })),
    };
  }, [candles, ghosts, width, height]);

  const money = (n: number) =>
    n >= 1000 ? Math.round(n).toLocaleString("en-AU") : n.toFixed(n < 10 ? 2 : 0);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {geo && (
          <>
            <Svg width={width} height={height}>
              {geo.rows.map((r, i) => (
                <Line key={i} x1={0} y1={r.y} x2={geo.w} y2={r.y}
                  stroke={colors.line} strokeWidth={1}
                  strokeDasharray={i === 1 ? "3 4" : undefined} />
              ))}

              {/* Drawn before the bars, so a ghost never crosses a candle. */}
              {geo.ghostPaths.map((d, i) => (
                <Path key={`g${i}`} d={d} stroke={colors.lineStrong}
                  strokeWidth={1.5} fill="none" opacity={0.5} strokeLinecap="round" />
              ))}

              {/* One reading per bar: a dash at the close, which is the only
                  value anybody actually observed. A <View> cannot go inside
                  an <Svg>, so the two cases are separate lists rather than a
                  branch inside one. */}
              {!ohlc && geo.bars.map((b, i) => (
                <Line key={`d${i}`}
                  x1={b.x - geo.body / 2} y1={b.top}
                  x2={b.x + geo.body / 2} y2={b.top}
                  stroke={b.up ? colors.up : colors.down}
                  strokeWidth={2.5} strokeLinecap="round" />
              ))}

              {ohlc && geo.bars.map((b, i) => (
                <Line key={`w${i}`}
                  x1={b.x} y1={b.high} x2={b.x} y2={b.low}
                  stroke={b.up ? colors.up : colors.down} strokeWidth={1.5} />
              ))}
              {ohlc && geo.bars.map((b, i) => (
                <Rect key={`b${i}`}
                  x={b.x - geo.body / 2}
                  y={b.top}
                  width={geo.body}
                  height={Math.max(1.5, b.bottom - b.top)}
                  rx={2}
                  fill={b.up ? colors.up : colors.down} />
              ))}
            </Svg>

            {geo.rows.map((r, i) => (
              <Txt key={i} variant="bodySmall" color={colors.inkFaint}
                style={[s.axis, { top: r.y - 8 }]}>
                {money(r.v)}
              </Txt>
            ))}
          </>
        )}
      </View>

      {ranges && ranges.length > 0 && (
        <View style={s.ranges}>
          {ranges.map((r) => (
            <Pressable key={r.id} onPress={() => onRange?.(r.id)}
              style={[s.range, r.id === range && s.rangeOn]}>
              <Txt variant="button" color={r.id === range ? colors.onPrimary : colors.inkMuted}>
                {r.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}

      {note && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 6 }}>{note}</Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  axis: { position: "absolute", right: 0, width: 46, textAlign: "right", fontSize: 11 },
  ranges: { flexDirection: "row", gap: 6, marginTop: space.md },
  range: {
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    borderWidth: 1, borderColor: colors.line,
  },
  rangeOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});

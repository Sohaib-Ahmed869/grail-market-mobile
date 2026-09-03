import { useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, Line, LinearGradient, Path, Stop, Circle } from "react-native-svg";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

/** A price series with the furniture a chart needs to be read.
 *
 *  The sparkline it replaces had a shape and nothing else — no scale, no
 *  numbers, no sense of where the current price sits in the range. You could
 *  see that a card moved and not what it moved between.
 *
 *  Deliberately a line and not candlesticks. A candle needs an open, a high,
 *  a low and a close for every bar, and the feed gives one price per point —
 *  three of the four would have to be invented. Drawing them anyway would be
 *  fabricating market data on a screen people use to decide what to pay,
 *  which is the one thing this app must never do.
 */
export function MarketChart({
  points, height = 132, label,
}: {
  points: number[];
  height?: number;
  /** e.g. "last 6 readings" — says what the axis actually spans. */
  label?: string;
}) {
  const [width, setWidth] = useState(0);
  const PAD_R = 52;   // room for the price labels
  const PAD_B = 18;

  const geo = useMemo(() => {
    if (!width || points.length < 2) return null;
    const w = width - PAD_R;
    const h = height - PAD_B;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || Math.max(max * 0.08, 1);
    const step = w / (points.length - 1);

    const xy = points.map((p, i) => ({
      x: i * step,
      y: 8 + (1 - (p - min) / span) * (h - 16),
    }));

    // One path per leg, not one path for the whole line.
    //
    // A single colour can only say where the card ended up. Colouring each
    // leg by its own direction says how it got there — the run up, the leg
    // that gave it back — which is the thing a candlestick chart is actually
    // communicating and a mono-colour line throws away.
    const legs = xy.slice(0, -1).map((a, i) => {
      const b = xy[i + 1]!;
      const cx = (a.x + b.x) / 2;
      const d =
        `M${a.x.toFixed(1)} ${a.y.toFixed(1)}` +
        ` C${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      return { d, up: points[i + 1]! >= points[i]!, a, b, cx };
    });

    // Three lines: the high, the middle and the low of what actually
    // happened. Evenly spaced gridlines at round numbers would be prettier
    // and would not tell you the range, which is the thing worth knowing.
    const rows = [0, 0.5, 1].map((f) => ({
      y: 8 + f * (h - 16),
      value: max - f * span,
    }));

    return { legs, xy, min, max, w, h, rows, last: xy[xy.length - 1]! };
  }, [points, width, height]);

  // The pill and the end dot take the LAST leg's direction, not the overall
  // one: they mark where the price is now and which way it was going when it
  // got there.
  const lastUp =
    points.length > 1 && points[points.length - 1]! >= points[points.length - 2]!;
  const tone = lastUp ? colors.up : colors.down;
  const money = (n: number) =>
    n >= 1000 ? `${Math.round(n).toLocaleString("en-AU")}` : n.toFixed(n < 10 ? 2 : 0);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {geo && (
          <>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="fill-up" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.up} stopOpacity={0.20} />
                  <Stop offset="1" stopColor={colors.up} stopOpacity={0} />
                </LinearGradient>
                <LinearGradient id="fill-down" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.down} stopOpacity={0.20} />
                  <Stop offset="1" stopColor={colors.down} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {geo.rows.map((r, i) => (
                <Line
                  key={i}
                  x1={0} y1={r.y} x2={geo.w} y2={r.y}
                  stroke={colors.line}
                  strokeWidth={1}
                  // The middle line is a reference, not a boundary, so it is
                  // dashed and the two edges are solid.
                  strokeDasharray={i === 1 ? "3 4" : undefined}
                />
              ))}

              {/* Fills first, so every stroke sits on top of every fill —
                  drawn leg by leg, a later fill would otherwise cut across
                  the stroke of the leg before it. */}
              {geo.legs.map((leg, i) => (
                <Path
                  key={`f${i}`}
                  d={`${leg.d} L${leg.b.x.toFixed(1)} ${geo.h} L${leg.a.x.toFixed(1)} ${geo.h} Z`}
                  fill={leg.up ? "url(#fill-up)" : "url(#fill-down)"}
                />
              ))}
              {geo.legs.map((leg, i) => (
                <Path
                  key={`s${i}`}
                  d={leg.d}
                  stroke={leg.up ? colors.up : colors.down}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {/* A dot at every reading. With the legs in two colours the
                  joins are where the direction changed, and they are worth
                  marking — that is the point the card turned. */}
              {geo.xy.slice(1, -1).map((p, i) => (
                <Circle
                  key={`p${i}`}
                  cx={p.x} cy={p.y} r={2.5}
                  fill={colors.surface}
                  stroke={geo.legs[i]!.up ? colors.up : colors.down}
                  strokeWidth={1.5}
                />
              ))}
              <Circle cx={geo.last.x} cy={geo.last.y} r={4}
                fill={colors.surface} stroke={tone} strokeWidth={2.5} />
            </Svg>

            {/* The scale, on the right where a price axis goes. */}
            {geo.rows.map((r, i) => (
              <Txt
                key={i}
                variant="bodySmall"
                color={colors.inkFaint}
                style={[s.axis, { top: r.y - 8 }]}
              >
                {money(r.value)}
              </Txt>
            ))}

            {/* Where it is now, called out the way a live price is. */}
            <View style={[s.now, { top: geo.last.y - 11, backgroundColor: tone }]}>
              <Txt variant="bodySmall" color={colors.onPrimary} style={s.nowTxt}>
                {money(points[points.length - 1]!)}
              </Txt>
            </View>
          </>
        )}
      </View>

      {label && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={s.label}>{label}</Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  axis: { position: "absolute", right: 0, width: 48, textAlign: "right", fontSize: 11 },
  now: {
    position: "absolute", right: 0,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill,
  },
  nowTxt: { ...type.bodySmall, fontSize: 11, fontVariant: ["tabular-nums"] },
  label: { marginTop: 2 },
});

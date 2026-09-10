import { useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Txt } from "./Text";
import { colors, space } from "../theme";

export type Series = {
  id: string;
  label: string;
  /** One slot per day of the window, oldest first. Null where the card has
   *  no reading that day — before its history starts, or a day the store
   *  missed. The line begins at the first reading and is never stretched to
   *  fill the window, so two cards on the same x are on the same day. */
  points: (number | null)[];
};

/** Every mover on one pair of axes.
 *
 *  A chart per card answers "what did this one do". Put together on one grid
 *  they answer the question somebody actually opened the app with: which of
 *  these is running and which is falling. That comparison is the entire point
 *  and it cannot be made by scrolling between separate pictures.
 *
 *  Rebased to 100 at each line's own start, because the cards on it are worth
 *  22 cents and eight thousand dollars. In dollars the expensive one is the
 *  only line you can see; as a percentage of where each began they are the
 *  same question.
 *
 *  One line is in front and the rest are held back, and any of them can be
 *  tapped to bring it forward. Eight lines at equal weight is a scribble —
 *  the muted ones give the highlighted one something to be compared against.
 */
export function TrendCompare({
  series, selectedId, onSelect, height = 176, from, to,
}: {
  series: Series[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
  /** Labels for the two ends of the x axis. */
  from?: string;
  to?: string;
}) {
  const [width, setWidth] = useState(0);
  const PAD_R = 46;
  const PAD_B = 4;

  const geo = useMemo(() => {
    const live = series
      .map((s) => {
        const first = s.points.findIndex((p) => p != null && p > 0);
        return { ...s, first };
      })
      .filter((s) => s.first >= 0 && s.points.filter((p) => p != null).length > 1);
    if (!width || !live.length) return null;
    const n = Math.max(...live.map((s) => s.points.length));
    if (n < 2) return null;

    // Percent of where each line started. The y axis is one scale that means
    // the same thing for every card on it.
    const rebased = live.map((s) => {
      const base = s.points[s.first]!;
      return { ...s, rel: s.points.map((p) => (p == null ? null : (p / base) * 100)) };
    });

    // The axis belongs to the line in front. It is scaled to that line and
    // to 100, and then widened to take in the others — but only up to three
    // times the front line's own range. Beyond that a line leaves the chart
    // at the top or bottom edge, which is the truthful picture: one card at
    // +1188% (a nine-cent card, one bad reading) used to own the whole scale
    // and press every other line flat against the floor.
    const front = rebased.find((s) => s.id === selectedId) ?? rebased[0]!;
    const own = front.rel.filter((v): v is number => v != null);
    let min = Math.min(...own, 100);
    let max = Math.max(...own, 100);
    const cap = Math.max((max - min) * 3, 30);
    const others = rebased.filter((s) => s !== front)
      .flatMap((s) => s.rel.filter((v): v is number => v != null));
    for (const v of others) {
      if (v < min && max - v <= cap) min = v;
      if (v > max && v - min <= cap) max = v;
    }
    const span = max - min || 10;
    const w = width - PAD_R;
    const h = height - PAD_B;
    const step = w / (n - 1);
    const y = (v: number) => 8 + (1 - (v - min) / span) * (h - 16);

    const path = (rel: (number | null)[]) => {
      const xy = rel
        .map((v, i) => (v == null ? null : { x: i * step, y: y(v) }))
        .filter((p): p is { x: number; y: number } => p != null);
      let d = `M${xy[0]!.x.toFixed(1)} ${xy[0]!.y.toFixed(1)}`;
      for (let i = 0; i < xy.length - 1; i++) {
        const a = xy[i]!, b = xy[i + 1]!;
        const cx = (a.x + b.x) / 2;
        d += ` C${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      const end = xy[xy.length - 1]!;
      // The same line closed down to the floor, for the fill under the one
      // in front.
      const area = `${d} L${end.x.toFixed(1)} ${h} L${xy[0]!.x.toFixed(1)} ${h} Z`;
      return { d, area, end, last: rel.filter((v): v is number => v != null).at(-1)! };
    };

    return {
      w, h, min, max,
      // 100 is where everything started, so it is the line that matters —
      // above it is up, below it is down, and no other gridline says that.
      baseline: y(100),
      rows: [max, (max + min) / 2, min].map((v) => ({ v, y: y(v) })),
      lines: rebased.map((s) => ({ id: s.id, label: s.label, ...path(s.rel), up: true }))
        .map((l) => ({ ...l, up: l.last >= 100 })),
    };
  }, [series, width, height, selectedId]);

  const front = geo?.lines.find((l) => l.id === selectedId) ?? null;
  const tone = front ? (front.up ? colors.up : colors.down) : colors.ink;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {geo && (
          <>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="frontFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tone} stopOpacity={0.18} />
                  <Stop offset="1" stopColor={tone} stopOpacity={0} />
                </LinearGradient>
                <ClipPath id="plot"><Rect x={0} y={0} width={geo.w} height={geo.h} /></ClipPath>
              </Defs>
              {geo.rows.map((r, i) => (
                <Line key={i} x1={0} y1={r.y} x2={geo.w} y2={r.y}
                  stroke={colors.line} strokeWidth={1} />
              ))}
              <Line
                x1={0} y1={geo.baseline} x2={geo.w} y2={geo.baseline}
                stroke={colors.lineStrong} strokeWidth={1} strokeDasharray="4 4"
              />

              <G clipPath="url(#plot)">
              {front && <Path d={front.area} fill="url(#frontFill)" />}

              {/* Muted first, so the highlighted line is never crossed by one
                  drawn after it. Each muted line also carries a wide invisible
                  twin, which is what a finger can actually land on. */}
              {geo.lines.filter((l) => l.id !== selectedId).map((l) => (
                <Path key={l.id} d={l.d} stroke={colors.outline} strokeWidth={1.5}
                  fill="none" strokeLinecap="round" opacity={0.7} />
              ))}
              {front && (
                <>
                  <Path d={front.d} stroke={tone} strokeWidth={3} fill="none"
                    strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={front.end.x} cy={front.end.y} r={4.5}
                    fill={colors.surface} stroke={tone} strokeWidth={2.5} />
                </>
              )}
              {onSelect && geo.lines.filter((l) => l.id !== selectedId).map((l) => (
                <Path key={`${l.id}-hit`} d={l.d} stroke="transparent" strokeWidth={18}
                  fill="none" onPress={() => onSelect(l.id)} />
              ))}
              </G>
            </Svg>

            {geo.rows.filter((r) => Math.abs(r.y - geo.baseline) > 14).map((r, i) => (
              <Txt key={i} variant="bodySmall" color={colors.inkFaint}
                style={[s.axis, { top: r.y - 8 }]}>
                {r.v >= 100 ? "+" : "−"}{Math.abs(r.v - 100).toFixed(0)}%
              </Txt>
            ))}
            <Txt variant="bodySmall" color={colors.inkMuted}
              style={[s.axis, s.base, { top: geo.baseline - 8 }]}>
              start
            </Txt>
          </>
        )}
      </View>
      {(from || to) && (
        <View style={s.dates}>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ fontSize: 11 }}>{from}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ fontSize: 11 }}>{to}</Txt>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  axis: { position: "absolute", right: 0, width: 42, textAlign: "right", fontSize: 11 },
  base: { fontSize: 10.5 },
  dates: { flexDirection: "row", justifyContent: "space-between", paddingRight: 46, marginTop: 2 },
});

import { useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Txt } from "./Text";
import { colors, space } from "../theme";

export type Series = {
  id: string;
  label: string;
  /** Price readings, oldest first. */
  points: number[];
};

/** Every mover on one pair of axes.
 *
 *  A chart per card answers "what did this one do". Put together on one grid
 *  they answer the question somebody actually opened the app with: which of
 *  these is running and which is falling. That comparison is the entire point
 *  and it cannot be made by scrolling between separate pictures.
 *
 *  Rebased to 100 at the start, because the cards on it are worth 22 cents
 *  and eight thousand dollars. In dollars the expensive one is the only line
 *  you can see and every other one is flat against the bottom; as a percentage
 *  of where each began, they are finally the same question.
 *
 *  One line is highlighted and the rest are held back. Eleven lines at equal
 *  weight is a scribble — the muted ones give the highlighted one something
 *  to be compared against, which is why they are drawn at all.
 */
export function TrendCompare({
  series, selectedId, label, height = 168,
}: {
  series: Series[];
  /** Which line is in front — the biggest mover, which is also the first row
   *  under the chart. */
  selectedId?: string | null;
  /** Names the highlighted line, since there is no legend to do it. */
  label?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const PAD_R = 46;
  const PAD_B = 4;

  const geo = useMemo(() => {
    const live = series.filter((s) => s.points.length > 1 && s.points[0]! > 0);
    if (!width || !live.length) return null;

    // Percent of where each line started. The y axis is now one scale that
    // means the same thing for every card on it.
    const rebased = live.map((s) => ({
      ...s,
      rel: s.points.map((p) => (p / s.points[0]!) * 100),
    }));

    const all = rebased.flatMap((s) => s.rel);
    const min = Math.min(...all, 100);
    const max = Math.max(...all, 100);
    const span = max - min || 10;
    const w = width - PAD_R;
    const h = height - PAD_B;

    const path = (rel: number[]) => {
      const step = w / (rel.length - 1);
      const xy = rel.map((v, i) => ({
        x: i * step,
        y: 8 + (1 - (v - min) / span) * (h - 16),
      }));
      let d = `M${xy[0]!.x.toFixed(1)} ${xy[0]!.y.toFixed(1)}`;
      for (let i = 0; i < xy.length - 1; i++) {
        const a = xy[i]!, b = xy[i + 1]!;
        const cx = (a.x + b.x) / 2;
        d += ` C${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      return { d, end: xy[xy.length - 1]! };
    };

    const y = (v: number) => 8 + (1 - (v - min) / span) * (h - 16);

    return {
      w, h, min, max,
      // 100 is where everything started, so it is the line that matters —
      // above it is up, below it is down, and no other gridline says that.
      baseline: y(100),
      rows: [max, (max + min) / 2, min].map((v) => ({ v, y: y(v) })),
      lines: rebased.map((s) => ({
        id: s.id,
        label: s.label,
        up: s.rel[s.rel.length - 1]! >= 100,
        ...path(s.rel),
      })),
    };
  }, [series, width, height]);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {label && (
        <View style={s.head}>
          <View style={s.dot} />
          <Txt variant="button" numberOfLines={1}>{label}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            against {Math.max(0, series.length - 1)} others
          </Txt>
        </View>
      )}
      <View style={{ height }}>
        {geo && (
          <>
            <Svg width={width} height={height}>
              {geo.rows.map((r, i) => (
                <Line key={i} x1={0} y1={r.y} x2={geo.w} y2={r.y}
                  stroke={colors.line} strokeWidth={1} />
              ))}
              <Line
                x1={0} y1={geo.baseline} x2={geo.w} y2={geo.baseline}
                stroke={colors.lineStrong} strokeWidth={1} strokeDasharray="4 4"
              />

              {/* Muted first, so the highlighted line is never crossed by one
                  drawn after it. */}
              {geo.lines.filter((l) => l.id !== selectedId).map((l) => (
                <Path key={l.id} d={l.d} stroke={colors.lineStrong} strokeWidth={1.5}
                  fill="none" strokeLinecap="round" opacity={0.55} />
              ))}
              {geo.lines.filter((l) => l.id === selectedId).map((l) => (
                <Path key={l.id} d={l.d} stroke={l.up ? colors.up : colors.down}
                  strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {geo.lines.filter((l) => l.id === selectedId).map((l) => (
                <Circle key={`${l.id}-e`} cx={l.end.x} cy={l.end.y} r={4.5}
                  fill={colors.surface} stroke={l.up ? colors.up : colors.down} strokeWidth={2.5} />
              ))}
            </Svg>

            {geo.rows.map((r, i) => (
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

      {/* No legend. The rows underneath this chart are already a list of
          exactly these cards, and a row of chips above them was the same list
          twice — which is the thing a legend is supposed to save you from. */}
    </View>
  );
}

const s = StyleSheet.create({
  axis: { position: "absolute", right: 0, width: 42, textAlign: "right", fontSize: 11 },
  base: { fontSize: 10.5 },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.down },
});

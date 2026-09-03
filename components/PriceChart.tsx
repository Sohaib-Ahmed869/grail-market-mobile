import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

export type ChartPoint = { day: string; price: number };

const money = (n: number) =>
  n >= 1000
    ? `A$${Math.round(n).toLocaleString("en-AU")}`
    : `A$${n.toFixed(n < 10 ? 2 : 0)}`;

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

/** A price over time, with a value you can read off it.
 *
 *  Sparklines carry a shape; this carries numbers, so it has a floor, a top
 *  and a bottom label, and a finger you can drag along it. Dragging is the
 *  point — "what was it worth in March" is the question a chart is for, and a
 *  chart you cannot interrogate only answers "up or down", which the
 *  percentage beside it already said. */
export function PriceChart({
  points, height = 180, tone,
}: {
  points: ChartPoint[];
  height?: number;
  /** Force a colour. By default it takes it from the direction of travel. */
  tone?: string;
}) {
  const [width, setWidth] = useState(0);
  const [held, setHeld] = useState<number | null>(null);

  const up = points.length > 1 && points[points.length - 1]!.price >= points[0]!.price;
  const stroke = tone ?? (up ? colors.up : colors.down);

  const geo = useMemo(() => {
    if (!width || points.length < 2) return null;
    const padTop = 14;
    const padBottom = 22;
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    // A flat series has no span to scale by; giving it one keeps the line in
    // the middle instead of pinned to an edge or dividing by zero.
    const span = max - min || Math.max(max * 0.1, 1);
    const usable = height - padTop - padBottom;
    const step = width / (points.length - 1);

    const xy = points.map((p, i) => ({
      x: i * step,
      y: padTop + (1 - (p.price - min) / span) * usable,
    }));

    let line = `M${xy[0]!.x.toFixed(1)} ${xy[0]!.y.toFixed(1)}`;
    for (let i = 0; i < xy.length - 1; i++) {
      const a = xy[i]!, b = xy[i + 1]!;
      const cx = (a.x + b.x) / 2;
      line += ` C${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    return {
      line, xy, min, max,
      area: `${line} L${width} ${height - padBottom} L0 ${height - padBottom} Z`,
      floor: height - padBottom,
      step,
    };
  }, [points, width, height]);

  // PanResponder from React Native itself rather than gesture-handler: this
  // needs one horizontal drag, and pulling in a native module for it would
  // mean a rebuild of both simulators to draw a line.
  //
  // The geometry is read through a ref because PanResponder captures its
  // handlers once — closing over `geo` directly would leave the first render's
  // width baked in, and the readout would be wrong on every rotation.
  const live = useRef({ step: 0, count: points.length });
  live.current = { step: geo?.step ?? 0, count: points.length };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // The chart sits inside a ScrollView. Claiming the gesture only once it
      // is clearly horizontal leaves a vertical swipe scrolling the page,
      // which is what a finger passing over a chart usually means.
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 4,
      onPanResponderGrant: (e) => at(e.nativeEvent.locationX),
      onPanResponderMove: (e) => at(e.nativeEvent.locationX),
      onPanResponderRelease: () => setHeld(null),
      onPanResponderTerminate: () => setHeld(null),
    }),
  ).current;

  function at(x: number) {
    const { step, count } = live.current;
    if (!step) return;
    setHeld(Math.min(count - 1, Math.max(0, Math.round(x / step))));
  }

  const shown = held != null ? points[held] : points[points.length - 1];

  return (
    <View
      style={s.wrap}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={s.readout}>
        <Txt variant="h1">{shown ? money(shown.price) : "—"}</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted}>
          {shown ? shortDay(shown.day) : ""}
        </Txt>
      </View>

      <View style={{ height }} {...pan.panHandlers}>
          {geo && (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.20} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Line
                x1={0} y1={geo.floor} x2={width} y2={geo.floor}
                stroke={colors.line} strokeWidth={1}
              />
              <Path d={geo.area} fill="url(#chartFill)" />
              <Path
                d={geo.line} stroke={stroke} strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
              {held != null && geo.xy[held] && (
                <>
                  <Line
                    x1={geo.xy[held]!.x} y1={0} x2={geo.xy[held]!.x} y2={geo.floor}
                    stroke={colors.lineStrong} strokeWidth={1} strokeDasharray="3 3"
                  />
                  <Circle
                    cx={geo.xy[held]!.x} cy={geo.xy[held]!.y} r={5}
                    fill={colors.surface} stroke={stroke} strokeWidth={2.5}
                  />
                </>
              )}
            </Svg>
          )}
      </View>

      {geo && (
        <View style={s.axis}>
          <Txt variant="bodySmall" color={colors.inkFaint}>{shortDay(points[0]!.day)}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {money(geo.min)} – {money(geo.max)}
          </Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {shortDay(points[points.length - 1]!.day)}
          </Txt>
        </View>
      )}
    </View>
  );
}

/** The range picker. Kept beside the chart rather than inside it, because two
 *  charts on one screen should not each grow their own controls. */
export function RangePicker({
  value, onChange, options = [30, 90, 365],
}: {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}) {
  const label = (d: number) => (d >= 365 ? "1y" : d >= 90 ? "3m" : `${d}d`);
  return (
    <View style={s.ranges}>
      {options.map((d) => (
        <View key={d} style={[s.range, value === d && s.rangeOn]}>
          <Txt
            variant="button"
            color={value === d ? colors.onPrimary : colors.inkMuted}
            onPress={() => onChange(d)}
          >
            {label(d)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.sm },
  readout: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  axis: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ranges: { flexDirection: "row", gap: 6 },
  range: {
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
  },
  rangeOn: { backgroundColor: colors.ink },
});

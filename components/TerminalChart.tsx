import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { Txt } from "./Text";
import { colors, space, type } from "../theme";

export type Bar = {
  day: string; open: number; high: number; low: number; close: number;
  /** True when the high and low were measured rather than implied by the
   *  open and close. A bar built from one reading a day has no wick. */
  measured: boolean;
};

const UP = colors.up;
const DOWN = colors.down;
const GRID = colors.line;
const AXIS = colors.inkFaint;

/** Candles, the way a trading terminal draws them.
 *
 *  A dark plate, one bar per day: green when the day closed above where it
 *  opened, red when below, the wick reaching the day's high and low. The
 *  last close runs across as a dashed line with its price tagged on the
 *  axis, which is the one line every terminal has and the one thing a
 *  glance is for. Drag across the plate and a crosshair walks the bars with
 *  the open, high, low and close of the day under the finger.
 *
 *  Nothing else on the plate. The other cards were drawn behind as faint
 *  lines for a while, and on a chart this small they read as scribble
 *  rather than context; the chips below are how you get to them.
 */
export function TerminalChart({
  bars, height = 200, format,
}: {
  bars: Bar[];
  height?: number;
  format: (n: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const PAD_R = 58;
  const PAD_T = 12;
  const PAD_B = 22;

  const geo = useMemo(() => {
    if (!width || bars.length < 1) return null;
    const w = width - PAD_R;
    const plot = height - PAD_T - PAD_B;
    const min = Math.min(...bars.map((b) => b.low));
    const max = Math.max(...bars.map((b) => b.high));
    const span = max - min || Math.max(max * 0.08, 0.01);
    const y = (v: number) => PAD_T + (1 - (v - min) / span) * plot;
    const slot = w / bars.length;
    const body = Math.max(2.5, Math.min(slot * 0.62, 14));

    const last = bars[bars.length - 1]!;
    // Date ticks: about four, on real bars.
    const every = Math.max(1, Math.round(bars.length / 4));
    const ticks = bars.map((b, i) => ({ i, b })).filter(({ i }) => i % every === 0 && i < bars.length - every / 2);

    return {
      w, plot, min, max, slot, body, y,
      lastY: y(last.close), last,
      rows: [max, (max + min) / 2, min].map((v) => ({ v, y: y(v) })),
      ticks: ticks.map(({ i, b }) => ({ x: i * slot + slot / 2, label: shortDay(b.day) })),
      bars: bars.map((b, i) => ({
        b, x: i * slot + slot / 2, up: b.close >= b.open,
        top: y(Math.max(b.open, b.close)), bottom: y(Math.min(b.open, b.close)),
        high: y(b.high), low: y(b.low),
      })),
    };
  }, [bars, width, height]);

  // The crosshair follows the finger and is not a scroll. `live` carries the
  // slot width into the responder without rebuilding it every layout.
  const live = useRef({ slot: 0, n: 0 });
  live.current = { slot: geo?.slot ?? 0, n: bars.length };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => place(e.nativeEvent.locationX),
    onPanResponderMove: (e) => place(e.nativeEvent.locationX),
    onPanResponderRelease: () => setHeld(null),
    onPanResponderTerminate: () => setHeld(null),
  })).current;
  function place(x: number) {
    const { slot, n } = live.current;
    if (!slot) return;
    setHeld(Math.min(n - 1, Math.max(0, Math.floor(x / slot))));
  }

  const focus = held != null && geo ? geo.bars[held] ?? null : null;
  const shown = focus?.b ?? geo?.last ?? null;
  const shownUp = shown ? shown.close >= shown.open : true;

  return (
    <View style={s.plate} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* O H L C of the bar in hand, or the latest. The row a terminal keeps
          at the top of the plate. */}
      <View style={s.ohlc}>
        {shown ? (
          <>
            <Cell k="O" v={format(shown.open)} />
            <Cell k="H" v={format(shown.high)} />
            <Cell k="L" v={format(shown.low)} />
            <Cell k="C" v={format(shown.close)} tone={shownUp ? UP : DOWN} />
            <Txt style={s.day}>{focus ? shortDay(shown.day) : "latest"}</Txt>
          </>
        ) : null}
      </View>

      <View style={{ height }} {...pan.panHandlers}>
        {geo && (
          <>
            <Svg width={width} height={height}>
              {geo.rows.map((r, i) => (
                <Line key={i} x1={0} y1={r.y} x2={geo.w} y2={r.y} stroke={GRID} strokeWidth={1} />
              ))}
              {geo.ticks.map((t, i) => (
                <Line key={`t${i}`} x1={t.x} y1={PAD_T} x2={t.x} y2={PAD_T + geo.plot} stroke={GRID} strokeWidth={1} />
              ))}


              {/* wicks, then bodies */}
              {geo.bars.map((b, i) => (
                <Line key={`w${i}`} x1={b.x} y1={b.high} x2={b.x} y2={b.low}
                  stroke={b.up ? UP : DOWN} strokeWidth={1.25} opacity={b.b.measured ? 1 : 0.7} />
              ))}
              {geo.bars.map((b, i) => (
                <Rect key={`b${i}`} x={b.x - geo.body / 2} y={b.top} width={geo.body}
                  height={Math.max(1.5, b.bottom - b.top)} rx={1.5}
                  fill={b.up ? UP : DOWN} opacity={held != null && held !== i ? 0.55 : 1} />
              ))}

              {/* the last close, tagged */}
              <Line x1={0} y1={geo.lastY} x2={geo.w} y2={geo.lastY}
                stroke={geo.last.close >= geo.last.open ? UP : DOWN} strokeWidth={1} strokeDasharray="3 3" opacity={0.9} />

              {focus && (
                <>
                  <Line x1={focus.x} y1={PAD_T} x2={focus.x} y2={PAD_T + geo.plot}
                    stroke={colors.inkMuted} strokeWidth={1} strokeDasharray="2 3" />
                  <Line x1={0} y1={geo.y(focus.b.close)} x2={geo.w} y2={geo.y(focus.b.close)}
                    stroke={colors.inkMuted} strokeWidth={1} strokeDasharray="2 3" />
                </>
              )}

              {geo.ticks.map((t, i) => (
                <SvgText key={`tl${i}`} x={t.x} y={height - 6} fill={AXIS} fontSize={10}
                  textAnchor="middle" fontFamily={type.overline.fontFamily}>{t.label}</SvgText>
              ))}
            </Svg>

            {geo.rows.filter((r) => Math.abs(r.y - geo.lastY) > 12).map((r, i) => (
              <Txt key={i} style={[s.axis, { top: r.y - 7 }]}>{format(r.v)}</Txt>
            ))}
            <View style={[s.tag, { top: geo.lastY - 9, backgroundColor: geo.last.close >= geo.last.open ? UP : DOWN }]}>
              <Txt style={s.tagTxt}>{format(geo.last.close)}</Txt>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function Cell({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <View style={s.cell}>
      <Txt style={s.cellK}>{k}</Txt>
      <Txt style={[s.cellV, tone ? { color: tone } : null]}>{v}</Txt>
    </View>
  );
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

const s = StyleSheet.create({
  plate: { paddingTop: space.xs, paddingBottom: 2 },
  ohlc: { flexDirection: "row", alignItems: "center", gap: space.md, height: 20 },
  cell: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  cellK: { ...type.overline, fontSize: 10, color: AXIS },
  cellV: { ...type.overline, fontSize: 11.5, color: colors.ink, fontVariant: ["tabular-nums"] },
  day: { ...type.overline, fontSize: 10, color: AXIS, marginLeft: "auto" },
  axis: {
    position: "absolute", right: 6, width: 50, textAlign: "right",
    ...type.overline, fontSize: 10.5, color: AXIS, fontVariant: ["tabular-nums"],
  },
  tag: {
    position: "absolute", right: 4, minWidth: 50, height: 18, borderRadius: 4,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  tagTxt: { ...type.overline, fontSize: 10.5, color: colors.onPrimary, fontVariant: ["tabular-nums"] },
});

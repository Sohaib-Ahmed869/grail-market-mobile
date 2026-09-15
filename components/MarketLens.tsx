import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { Txt } from "./Text";
import { aud, convert, money, type Fx } from "../lib/fx";
import { fonts } from "../theme";

/** The editorial home palette: warm paper, navy glass, champagne gold. Kept
 *  beside the components that use it rather than in the app theme — it is
 *  the home screen's look, not a change to every screen. */
export const lens = {
  paper: "#F4F4F0",
  ink: "#1C2733",
  inkSoft: "#56606A",
  inkFaint: "#707981",
  gold: "#D7B98A",
  goldText: "#7A6340",
  cream: "#F6EEDC",
  hairline: "rgba(28,39,51,0.14)",
  outline: "#AEB6BB",
  up: "#3F6B47", upWash: "#E1EFE2", upLine: "#4E7A58",
  down: "#9B4E3E", downWash: "#F4E0DA", downLine: "#B0614F",
} as const;

/** Line height for a font size. Txt starts every style from the body
 *  variant, whose fixed 23px line height crops anything much over 18px — so
 *  every home style sets its own, and they all come from here. Outfit's
 *  ascent and descent need about 1.3× the size; less clips the tops. */
export const lh = (size: number) => Math.round(size * 1.32);

/** A dollar figure the way the home screen prints it: "$285" beside a
 *  separate currency label, instead of "A$285". Converted from US dollars
 *  when there is a rate; when there is not, the US figure with "USD", never a
 *  US number under an Australian label. */
export function dollars(usd: number | null | undefined, fx: Fx | null): { text: string; ccy: string } {
  const a = convert(usd, { fx, from: "USD" });
  if (a != null) return { text: aud(a).replace(/^A\$/, "$"), ccy: "AUD" };
  return { text: money(usd, { fx, from: "USD" }).replace(/^US\$/, "$"), ccy: "USD" };
}

const pctText = (p: number) => `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

const WINDOWS = [7, 30] as const;
const CHART_H = 136;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 8;

/** One card's price over time, on navy glass.
 *
 *  Every figure on this panel comes from ONE series: the store's daily raw
 *  market closes for this card. The headline, the change, the low, the high
 *  and the scrubbed reading are all points on the line drawn — so nothing
 *  here can disagree with the chart beside it, which is the defect the card
 *  page shipped twice.
 */
export function MarketLens({
  name, closes, fx, condition, printing, following, onFollow, onOpen,
}: {
  name: string;
  /** Daily closes in US dollars, oldest first, the last 30 days. */
  closes: { day: string; price: number }[];
  fx: Fx | null;
  condition?: string | null;
  printing?: string | null;
  following: boolean;
  onFollow: () => void;
  onOpen: () => void;
}) {
  const has7 = useMemo(() => inWindow(closes, 7).length >= 2, [closes]);
  const [days, setDays] = useState<7 | 30>(30);
  const series = useMemo(() => inWindow(closes, days === 7 && !has7 ? 30 : days), [closes, days, has7]);

  const [scrub, setScrub] = useState<number | null>(null);
  const at = scrub == null ? series.length - 1 : Math.min(scrub, series.length - 1);
  const shown = series[at];
  const last = series[series.length - 1];
  const first = series[0];
  const change = first && last && first.price > 0 ? ((last.price - first.price) / first.price) * 100 : null;
  const low = series.reduce((m, p) => Math.min(m, p.price), Infinity);
  const high = series.reduce((m, p) => Math.max(m, p.price), -Infinity);
  const headline = dollars(last?.price, fx);

  // ---- geometry ------------------------------------------------------------
  const [w, setW] = useState(0);
  const onChartLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const spread = high - low;
  const lo = spread > 0 ? low - spread * 0.12 : low * 0.95;
  const hi = spread > 0 ? high + spread * 0.12 : high * 1.05 || 1;
  const plotW = Math.max(1, w - PAD_L - PAD_R);
  const x = (i: number) => PAD_L + (series.length > 1 ? (i / (series.length - 1)) * plotW : plotW);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo || 1)) * (CHART_H - PAD_T - PAD_B);
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const area = series.length > 1
    ? `${line} L${x(series.length - 1).toFixed(1)},${CHART_H - PAD_B} L${x(0).toFixed(1)},${CHART_H - PAD_B} Z`
    : "";
  const ticks = [hi, (hi + lo) / 2, lo];

  // ---- scrubbing -------------------------------------------------------------
  // The slider and the chart are one control: dragging either moves the same
  // reading. Horizontal drags only, so the page still scrolls under a thumb
  // that is moving up.
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(1);
  const indexAt = (pageX: number) => {
    const t = Math.min(1, Math.max(0, (pageX - trackX.current) / trackW.current));
    return Math.round(t * (series.length - 1));
  };
  const measure = () => trackRef.current?.measureInWindow((px, _py, width) => {
    trackX.current = px; trackW.current = Math.max(1, width);
  });
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => setScrub(indexAt(e.nativeEvent.pageX)),
    onPanResponderMove: (e) => setScrub(indexAt(e.nativeEvent.pageX)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [series.length]);

  const chartRef = useRef<View>(null);
  const chartX = useRef(0);
  const chartPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (e) => {
      const t = Math.min(1, Math.max(0, (e.nativeEvent.pageX - chartX.current - PAD_L) / plotW));
      setScrub(Math.round(t * (series.length - 1)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [series.length, plotW]);

  const frac = series.length > 1 ? at / (series.length - 1) : 1;
  const windowLabel = days === 7 && has7 ? 7 : 30;

  return (
    <View style={s.shell}>
      <LinearGradient
        colors={["#50666F", "#2A3B4B", "#1A2533"]}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* The violet that pools in the lower-left corner of the reference. */}
      <LinearGradient
        colors={["rgba(96,82,138,0)", "rgba(96,82,138,0.42)"]}
        start={{ x: 0.7, y: 0.35 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(215,185,138,0)", "rgba(215,185,138,0.7)", "rgba(215,185,138,0)"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.rim}
      />

      {/* ---- head ------------------------------------------------------------ */}
      <View style={s.head}>
        <Pressable onPress={onOpen} style={{ flex: 1 }} hitSlop={6}>
          <Txt style={s.overline} numberOfLines={1}>MARKET LENS · {name.toUpperCase()}</Txt>
        </Pressable>
        <Pressable onPress={onFollow} hitSlop={10} accessibilityRole="button"
          accessibilityLabel={following ? "Following this card" : "Follow this card"}>
          <Feather name="eye" size={17} color={following ? lens.gold : "rgba(246,238,220,0.75)"} />
        </Pressable>
      </View>

      <View style={s.priceRow}>
        <Txt style={s.price} numberOfLines={1}>{headline.text}</Txt>
        <View style={{ alignItems: "flex-end" }}>
          <Txt style={s.meta}>{headline.ccy}</Txt>
          <Txt style={s.meta}>UNGRADED</Txt>
        </View>
      </View>
      <Txt style={s.sub} numberOfLines={1}>
        {series.length} daily close{series.length === 1 ? "" : "s"} · last {windowLabel} days
      </Txt>
      {change != null && (
        <View style={s.pill}>
          <Feather name={change >= 0 ? "arrow-up-right" : "arrow-down-right"} size={11} color={lens.cream} />
          <Txt style={s.pillText}>{pctText(change)} · {windowLabel}d</Txt>
        </View>
      )}

      {/* ---- window ---------------------------------------------------------- */}
      <View style={s.windowRow}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {WINDOWS.map((d) => {
            const on = d === days;
            const disabled = d === 7 && !has7;
            return (
              <Pressable
                key={d}
                disabled={disabled}
                onPress={() => { setDays(d); setScrub(null); }}
                style={({ pressed }) => [s.window, !on && s.windowOff, disabled && { opacity: 0.35 }, pressed && { opacity: 0.8 }]}
                accessibilityRole="button" accessibilityState={{ selected: on, disabled }}
              >
                {on && (
                  <LinearGradient colors={["#F4E5C3", "#D9BE8E"]} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                )}
                <Txt style={[s.windowText, { color: on ? lens.ink : lens.cream }]}>{d}D</Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt style={s.caption}>Daily market close</Txt>
      </View>

      {/* ---- chart ----------------------------------------------------------- */}
      {/* Clipped to its own box: the line, the fill and the dot stay inside
          the plot rather than running into the padding of the panel. */}
      <View
        ref={chartRef}
        onLayout={(e) => {
          onChartLayout(e);
          chartRef.current?.measureInWindow((px) => { chartX.current = px; });
        }}
        style={s.chart}
        {...chartPan.panHandlers}
      >
        {w > 0 && series.length > 1 && (
          <Svg width={w} height={CHART_H}>
            <Defs>
              <SvgGradient id="lensFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lens.gold} stopOpacity={0.34} />
                <Stop offset="1" stopColor={lens.gold} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {ticks.map((t, i) => (
              <Line key={i} x1={PAD_L} x2={w - PAD_R} y1={y(t)} y2={y(t)}
                stroke="rgba(246,238,220,0.22)" strokeWidth={1} strokeDasharray="3 5" />
            ))}
            <Path d={area} fill="url(#lensFill)" />
            <Path d={line} stroke={lens.gold} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {scrub != null && (
              <Line x1={x(at)} x2={x(at)} y1={PAD_T} y2={CHART_H - PAD_B} stroke="rgba(246,238,220,0.35)" strokeWidth={1} />
            )}
            <Circle cx={x(at)} cy={y(shown?.price ?? 0)} r={4.5} fill={lens.cream} stroke={lens.gold} strokeWidth={2} />
          </Svg>
        )}
        {ticks.map((t, i) => (
          <Txt key={i} style={[s.tick, { top: y(t) - lh(10.5) / 2 }]} numberOfLines={1}>{dollars(t, fx).text}</Txt>
        ))}
      </View>
      <View style={s.dates}>
        <Txt style={s.date}>{first ? shortDay(first.day) : ""}</Txt>
        <Txt style={s.date}>{last ? shortDay(last.day) : ""}</Txt>
      </View>

      {/* ---- explore --------------------------------------------------------- */}
      <View style={s.exploreRow}>
        <Txt style={s.caption}>Explore the chart</Txt>
        {shown && (
          <View style={s.readout}>
            <Txt style={s.readoutText}>{shortDay(shown.day)} · {dollars(shown.price, fx).text}</Txt>
          </View>
        )}
      </View>
      <View
        ref={trackRef}
        onLayout={measure}
        style={s.trackHit}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Choose a day on the chart"
      >
        <View style={s.track}>
          <LinearGradient
            colors={["#C9AE7F", "#E5CD9F"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.trackFill, { width: `${frac * 100}%` }]}
          />
        </View>
        <View style={[s.thumb, { left: `${frac * 100}%` }]} />
      </View>

      {/* ---- facts ----------------------------------------------------------- */}
      <View style={s.facts}>
        <Fact label="PERIOD LOW" value={Number.isFinite(low) ? dollars(low, fx).text : "—"} />
        <View style={s.factRule} />
        <Fact label="PERIOD HIGH" value={Number.isFinite(high) ? dollars(high, fx).text : "—"} />
        <View style={s.factRule} />
        {condition
          ? <Fact label="CONDITION" value={condition} />
          : <Fact label="CHANGE" value={change == null ? "—" : pctText(change)} />}
      </View>

      <Txt style={s.foot} numberOfLines={1}>
        {["Raw market price", "daily closes", printing].filter(Boolean).join(" · ")}
      </Txt>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Txt style={s.factLabel} numberOfLines={1}>{label}</Txt>
      <Txt style={s.factValue} numberOfLines={1}>{value}</Txt>
    </View>
  );
}

function inWindow(closes: { day: string; price: number }[], days: number) {
  const d = new Date();
  const cutoff = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (days - 1)))
    .toISOString().slice(0, 10);
  return closes.filter((c) => c.day >= cutoff && Number.isFinite(c.price) && c.price > 0);
}

const s = StyleSheet.create({
  shell: {
    borderRadius: 24, overflow: "hidden", padding: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#1F2D3B",
    shadowColor: "#0B1622", shadowOpacity: 0.26, shadowRadius: 20, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  rim: { position: "absolute", top: 0, left: 36, right: 36, height: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  overline: { fontFamily: fonts.semi, fontSize: 11.5, lineHeight: lh(11.5), letterSpacing: 1.4, color: lens.gold },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 },
  price: {
    fontFamily: fonts.semi, fontSize: 42, lineHeight: lh(42), letterSpacing: -1.4,
    color: lens.cream, fontVariant: ["tabular-nums"], flexShrink: 1,
  },
  meta: { fontFamily: fonts.medium, fontSize: 11, lineHeight: lh(11), letterSpacing: 0.4, color: "rgba(246,238,220,0.8)" },
  sub: { fontFamily: fonts.medium, fontSize: 13, lineHeight: lh(13), color: "rgba(246,238,220,0.92)" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    marginTop: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9,
    borderWidth: 1, borderColor: "rgba(246,238,220,0.28)", backgroundColor: "rgba(255,255,255,0.05)",
  },
  pillText: { fontFamily: fonts.semi, fontSize: 12, lineHeight: lh(12), color: lens.cream, fontVariant: ["tabular-nums"] },
  windowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  window: {
    width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  windowOff: { borderWidth: 1, borderColor: "rgba(246,238,220,0.3)" },
  windowText: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: lh(13.5) },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: lh(12), color: "rgba(246,238,220,0.9)" },
  chart: { height: CHART_H, marginTop: 12, overflow: "hidden" },
  tick: {
    position: "absolute", left: 0, width: PAD_L - 6,
    fontFamily: fonts.medium, fontSize: 10.5, lineHeight: lh(10.5), color: "rgba(246,238,220,0.92)", fontVariant: ["tabular-nums"],
  },
  dates: { flexDirection: "row", justifyContent: "space-between", paddingLeft: PAD_L, paddingRight: PAD_R - 4, marginTop: 2 },
  date: { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: lh(10.5), color: "rgba(246,238,220,0.92)" },
  exploreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  readout: {
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9,
    borderWidth: 1, borderColor: "rgba(246,238,220,0.28)", backgroundColor: "rgba(255,255,255,0.05)",
  },
  readoutText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: lh(12), color: lens.cream, fontVariant: ["tabular-nums"] },
  trackHit: { height: 30, justifyContent: "center", marginTop: 6, marginHorizontal: 9 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(246,238,220,0.18)", overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 3 },
  thumb: {
    position: "absolute", width: 18, height: 18, marginLeft: -9, borderRadius: 9,
    backgroundColor: "#E9D3A8", borderWidth: 2, borderColor: "#F6EEDC",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  facts: {
    flexDirection: "row", alignItems: "center", marginTop: 14, paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(246,238,220,0.16)", backgroundColor: "rgba(255,255,255,0.04)",
  },
  factRule: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(246,238,220,0.18)", marginHorizontal: 10 },
  factLabel: { fontFamily: fonts.medium, fontSize: 9.5, lineHeight: lh(9.5), letterSpacing: 0.4, color: "rgba(246,238,220,0.85)" },
  factValue: { fontFamily: fonts.semi, fontSize: 15, lineHeight: lh(15), color: lens.cream, marginTop: 2, fontVariant: ["tabular-nums"] },
  foot: { fontFamily: fonts.medium, fontSize: 11, lineHeight: lh(11), color: "rgba(246,238,220,0.85)", marginTop: 12 },
});

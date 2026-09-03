import { useEffect } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgGrad, Path, Stop } from "react-native-svg";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { Bone } from "./Skeleton";
import { colors, radius, space, type } from "../theme";

export type HeroStat = { n: string; label: string };

/** What the collection is worth, on a card made of the collection.
 *
 *  Every app has this panel: dark rectangle, small label, big number, three
 *  figures on a rule. It is the shape a dashboard falls into, and it says
 *  nothing about what the number is made of.
 *
 *  Here the number is made of cards, so the panel is too — the artwork of what
 *  you actually hold, fanned along the top and dimmed under a scrim, with the
 *  week's line drawn along the bottom edge. It changes as the collection does,
 *  which no arrangement of type can.
 *
 *  Empty, it does not pretend: no artwork, no line, and the only thing on it
 *  is the one action that starts everything.
 */
export function ValueHero({
  value, delta, art, spark, stats, loading, empty, onScan, onPress, bare,
}: {
  value: string;
  /** Signed, already formatted. Null when there is no cost basis to compare. */
  delta?: { text: string; up: boolean } | null;
  /** Artwork from the collection, best first. Up to six are drawn. */
  art?: (string | null | undefined)[];
  /** The collection's value over time, most recent last. */
  spark?: number[];
  stats: HeroStat[];
  loading?: boolean;
  empty?: boolean;
  onScan?: () => void;
  onPress?: () => void;
  /** Drawn straight onto a dark band rather than as a panel on a light page.
   *
   *  A card sitting on a header is two containers for one idea. When the
   *  header IS the value, the panel's own gradient, corners and shadow are
   *  all describing an edge that should not be there. */
  bare?: boolean;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(reveal);
  }, [reveal]);

  const fan = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const held = (art ?? []).filter((u): u is string => Boolean(u));
  // Three or more, or none. One picture at the left edge of a dark panel is
  // not texture, it is a stray image — the effect only works once there are
  // enough of them to read as a row rather than as a thing.
  const images = held.length >= 3 ? held.slice(0, 7) : [];

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={bare ? s.bare : s.wrap}>
      {!bare && (
        <LinearGradient
          colors={["#25374A", colors.dark, "#0A1219"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ---- the collection, as the surface ------------------------------- */}
      {images.length > 0 && (
        <Animated.View style={[s.fan, fan]} pointerEvents="none">
          {/* A shelf across the top, not a fan down the middle. They are the
              texture the panel is made of — the moment one is large enough to
              look at, it competes with the number, which is the only thing
              here anybody came to read. */}
          {images.map((uri, i) => (
            <Image
              key={uri + i}
              source={{ uri }}
              style={[
                s.art,
                {
                  left: `${-4 + i * 15}%`,
                  transform: [{ rotate: `${i % 2 ? 6 : -5}deg` }],
                },
              ]}
              resizeMode="cover"
            />
          ))}
          {/* The scrim. Without it the artwork wins and the number — the
              entire reason for the panel — is the least readable thing on it. */}
          <LinearGradient
            colors={["rgba(10,18,25,0.78)", "rgba(10,18,25,0.94)", "#0A1219"]}
            locations={[0, 0.42, 0.78]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <View style={s.body}>
        <Txt variant="bodySmall" color={colors.onDarkMuted}>Collection value</Txt>

        {loading ? (
          <View style={{ marginTop: space.sm, gap: 8 }}>
            <Bone w="62%" h={34} style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
            <Bone w="40%" h={12} style={{ backgroundColor: "rgba(255,255,255,0.10)" }} />
          </View>
        ) : empty ? (
          <View style={{ marginTop: space.sm }}>
            <Txt variant="h1" color={colors.onDark}>Nothing In It Yet</Txt>
            <Txt variant="bodySmall" color={colors.onDarkMuted} style={{ marginTop: 4 }}>
              Scan a card and this starts tracking from today.
            </Txt>
            <Pressable onPress={onScan} style={s.cta}>
              <Icon name="scan" size={16} color={colors.dark} />
              <Txt variant="button" color={colors.dark}>Scan your first card</Txt>
            </Pressable>
          </View>
        ) : (
          <View style={s.valueRow}>
            <Txt style={s.value} color={colors.onDark}>{value}</Txt>
            {delta && (
              <View style={[s.delta, { backgroundColor: delta.up ? "rgba(44,122,91,0.3)" : "rgba(174,74,64,0.3)" }]}>
                <Txt variant="bodySmall" color={delta.up ? "#7FD3AE" : "#E9A19A"} numberOfLines={1}>
                  {delta.text}
                </Txt>
              </View>
            )}
          </View>
        )}

        <View style={s.stats}>
          {stats.map((st, i) => (
            <View key={st.label} style={[s.stat, i > 0 && s.statDivided]}>
              <Txt variant="h3" color={colors.onDark}>{st.n}</Txt>
              <Txt variant="bodySmall" color={colors.onDarkMuted}>{st.label}</Txt>
            </View>
          ))}
        </View>
      </View>

      {/* ---- the week, along the bottom edge ------------------------------ */}
      {spark && spark.length > 1 && <EdgeLine points={spark} />}
    </Pressable>
  );
}

/** The value's own line, drawn into the card's bottom edge rather than into a
 *  box of its own. It is the same fact as the big number, one level down —
 *  giving it a panel would make it a second thing to read. */
function EdgeLine({ points }: { points: number[] }) {
  const W = 1000, H = 120;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);

  const xy = points.map((p, i) => ({ x: i * step, y: H - ((p - min) / span) * (H * 0.8) - 6 }));
  let d = `M${xy[0]!.x} ${xy[0]!.y.toFixed(1)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const a = xy[i]!, b = xy[i + 1]!;
    const cx = (a.x + b.x) / 2;
    d += ` C${cx} ${a.y.toFixed(1)}, ${cx} ${b.y.toFixed(1)}, ${b.x} ${b.y.toFixed(1)}`;
  }
  const up = points[points.length - 1]! >= points[0]!;
  const tone = up ? "#7FD3AE" : "#E9A19A";

  return (
    <View style={s.edge} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgGrad id="heroFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tone} stopOpacity={0.28} />
            <Stop offset="1" stopColor={tone} stopOpacity={0} />
          </SvgGrad>
        </Defs>
        <Path d={`${d} L${W} ${H} L0 ${H} Z`} fill="url(#heroFill)" />
        <Path d={d} stroke={tone} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 22, overflow: "hidden",
    shadowColor: "#0B1622", shadowOpacity: 0.22, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  bare: { overflow: "visible" },
  fan: { ...StyleSheet.absoluteFillObject },
  art: {
    // Cropped by the panel's top edge, so only the head of each card shows —
    // a row of them standing in a box rather than pictures laid on one.
    position: "absolute", top: -26, width: "19%", aspectRatio: 0.72,
    borderRadius: 6,
  },
  body: { padding: space.lg, paddingBottom: space.md },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: 2 },
  // the number never yields to the badge beside it
  valueShrink: { flexShrink: 0 },
  value: { ...type.display, fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  delta: {
    paddingHorizontal: space.sm, paddingVertical: 3,
    borderRadius: radius.pill, marginBottom: 6, flexShrink: 1,
  },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 46, marginTop: space.lg, borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  stats: {
    flexDirection: "row", marginTop: space.lg, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.14)",
  },
  stat: { flex: 1 },
  statDivided: {
    borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.14)", paddingLeft: space.md,
  },
  edge: { position: "absolute", left: 0, right: 0, bottom: 0, height: 56 },
});

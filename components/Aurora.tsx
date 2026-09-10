import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
} from "react-native-reanimated";
import { Bloom } from "./Bloom";
import { colors } from "../theme";

/** The light moving behind the dashboard.
 *
 *  The first version of this was honest and invisible: three glows drifting
 *  twenty-odd pixels over half a minute, at opacities you had to be told
 *  about. Ambient motion still has to be motion — if nobody can tell whether
 *  it is running, it is costing frames for nothing.
 *
 *  So the light travels a real distance on periods short enough to notice
 *  inside a glance: nine to seventeen seconds.
 *
 *  It is LIGHT and nothing else. The version between these two drifted three
 *  card silhouettes up through the band, on the reasoning that a hand of
 *  cards belongs to this product where a glowing blob belongs to any. It
 *  did not survive contact with the screen: a rectangle at ten percent white
 *  on navy has a visible edge, so three of them read as grey slabs smeared
 *  across the header rather than as cards. Soft light has no edge to give
 *  itself away, which is the whole reason this is built out of radial
 *  gradients.
 *
 *  The periods share no common factor, so the arrangement never repeats a
 *  shape you have already seen. Everything is transform and opacity, driven
 *  on the UI thread: no re-render and no JavaScript per frame, so the list
 *  above it cannot stutter. It is strictly decorative, so it is the first
 *  thing to go when someone has asked their phone for less motion.
 */
export function Aurora({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (alive) setStill(on); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill);
    return () => { alive = false; sub.remove(); };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The corner is lit whether or not anything is moving: the drifting
          layers travel far enough now that without this the band would go
          flat at one end of their arc. */}
      <View style={[styles.layer, { top: -260, right: -150 }]}>
        <Bloom size={560} color={colors.accent} opacity={0.24} />
      </View>

      <Drift still={still} period={9000} x={-120} y={54} scale={0.30}
        style={{ top: -300, right: -190 }}>
        <Bloom size={640} color={colors.accent} opacity={0.52} />
      </Drift>

      <Drift still={still} period={13000} delay={900} x={130} y={-46} scale={0.26}
        style={{ bottom: -250, left: -210 }}>
        <Bloom size={560} color="#3E7FC1" opacity={0.50} />
      </Drift>

      <Drift still={still} period={17000} delay={2100} x={150} y={40} scale={0.22}
        style={{ top: height * 0.10, left: -80 }}>
        <Bloom size={420} color="#E0B978" opacity={0.40} />
      </Drift>

      <Sheen still={still} width={width} height={height} />
    </View>
  );
}

/** One glow, easing to an offset and back forever.
 *
 *  `reverse` on the repeat rather than a wrap-around: a loop that jumps home
 *  at the end shows a seam, and a seam is the one part of this anybody would
 *  consciously notice. */
function Drift({
  children, still, period, delay = 0, x, y, scale, style,
}: {
  children: React.ReactNode;
  still: boolean;
  period: number;
  delay?: number;
  x: number;
  y: number;
  scale: number;
  style: object;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) { t.value = 0; return; }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [still, period, delay]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * x },
      { translateY: t.value * y },
      { scale: 1 + t.value * scale },
    ],
  }));

  return <Animated.View style={[styles.layer, style, anim]}>{children}</Animated.View>;
}

/** A band of light crossing the header. */
function Sheen({ still, width, height }: { still: boolean; width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) { t.value = 0; return; }
    t.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [still]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: -width * 0.8 + t.value * width * 1.8 },
      { rotateZ: "18deg" },
    ],
    opacity: Math.sin(t.value * Math.PI),
  }));

  if (still) return null;
  return (
    <Animated.View style={[styles.sheen, { height: height * 2.4, top: -height * 0.7 }, anim]}>
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.11)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  sheen: { position: "absolute", left: 0, width: 210 },
});

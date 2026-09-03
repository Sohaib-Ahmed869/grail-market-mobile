import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme";

const APath = Animated.createAnimatedComponent(Path);

/** The moment something worked.
 *
 *  A static tick in a circle is a form-validation icon. This is the end of a
 *  signup somebody has just spent ten minutes and real money on, and the two
 *  should not look the same.
 *
 *  Three things happen, in order, because a celebration that fires all at once
 *  is a flash: the disc arrives with a spring, the tick DRAWS rather than
 *  appearing, and two rings expand out through it and fade. The tick drawing
 *  is the part that matters — a stroke that travels reads as something being
 *  completed, which is what just happened.
 */
export function SuccessSeal({ size = 108 }: { size?: number }) {
  const pop = useSharedValue(0);
  const draw = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    // Spring, not a timing curve. A seal that eases in politely is a loading
    // state; one that overshoots slightly has landed.
    pop.value = withDelay(80, withSpring(1, { damping: 11, stiffness: 150, mass: 0.7 }));
    draw.value = withDelay(320, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => { cancelAnimation(pop); cancelAnimation(draw); cancelAnimation(ring); };
  }, [pop, draw, ring]);

  const disc = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.6 + pop.value * 0.4 }],
  }));

  // The stroke is 100 units long by construction (pathLength), so the dash
  // offset is a straight percentage and does not need the real path measured.
  const tick = useAnimatedProps(() => ({ strokeDashoffset: 100 - draw.value * 100 }));

  const wave = (delay: number) =>
    useAnimatedStyle(() => {
      // Two rings a beat apart, from one driver — a second shared value would
      // be a second clock to keep in step with this one.
      const t = (ring.value + delay) % 1;
      return {
        opacity: (1 - t) * 0.5 * pop.value,
        transform: [{ scale: 1 + t * 0.9 }],
      };
    });

  const wave1 = wave(0);
  const wave2 = wave(0.5);

  const r = size / 2;

  return (
    <View style={[s.stage, { width: size * 2, height: size * 2 }]} pointerEvents="none">
      {[wave1, wave2].map((style, i) => (
        <Animated.View
          key={i}
          style={[
            s.ring,
            { width: size * 1.25, height: size * 1.25, borderRadius: size, borderColor: colors.accent },
            style,
          ]}
        />
      ))}

      <Animated.View style={[{ width: size, height: size }, disc]}>
        <LinearGradient
          colors={["#2C3E52", colors.dark]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
        <View style={[s.rim, { borderRadius: r }]} />
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="34" stroke={colors.accent} strokeOpacity={0.28}
            strokeWidth={1.5} fill="none" />
          <APath
            d="M31 51 L44 64 L69 38"
            stroke={colors.accent}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            // The whole point: the dash is the full length, so the offset
            // going to zero draws the stroke from its start to its end.
            strokeDasharray="100"
            // @ts-expect-error react-native-svg accepts pathLength at runtime
            pathLength={100}
            animatedProps={tick}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1.5 },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5, borderColor: "rgba(168,141,96,0.5)",
  },
});

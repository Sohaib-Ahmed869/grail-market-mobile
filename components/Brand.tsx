import { useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { Bloom } from "./Bloom";
import MarkSvg from "../assets/brand/mark.svg";
import MarkWhiteSvg from "../assets/brand/mark-white.svg";
import LockupDark from "../assets/brand/wordmark-dark.svg";
import LockupLight from "../assets/brand/wordmark.svg";
import { colors, radius, shadow } from "../theme";

/** The G on its own, as vector.
 *
 *  `onDark` picks the white-G counterpart. The brand pack ships the mark only
 *  in its light-ground form — navy G, gold cards — which vanishes on navy. */
export function Mark({ size = 40, onDark = false }: { size?: number; onDark?: boolean }) {
  const Svg = onDark ? MarkWhiteSvg : MarkSvg;
  return <Svg width={size} height={size} />;
}

/** The mark as a watermark: enormous, barely there, bleeding off an edge.
 *
 *  The hero used to carry an animated G AND the lockup, which also contains a
 *  G — the same letter twice, one of them moving, above a form. Two marks is
 *  not twice the brand, it is a screen with no clear subject.
 *
 *  So the letter stays, at an opacity where it is texture rather than a logo,
 *  and the lockup is the only thing actually being read. */
export function MarkWatermark({
  size = 300, opacity = 0.05, style,
}: { size?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ opacity }, style]} pointerEvents="none">
      <Mark size={size} onDark />
    </View>
  );
}

/** The mark, arriving.
 *
 *  For the front door, not for waiting. The Loader turns the card over and
 *  over because it is telling you something is still happening; this turns it
 *  face-up ONCE and then holds, because the thing that happened is that you
 *  got here. A logo that never stops moving on a sign-in screen is a logo
 *  competing with the form it is sitting above.
 *
 *  So: one half-turn to face, a lift, and then only a slow breath in the glow
 *  behind it — movement you notice if you look and not if you are typing.
 */
export function MarkIntro({
  size = 56, onDark = true, delay = 120,
}: { size?: number; onDark?: boolean; delay?: number }) {
  // 0 -> 1 arrival, driving the turn, the lift and the fade together so they
  // cannot drift apart the way three separate timings would.
  const arrive = useSharedValue(0);
  // Independent, slower, and started after the arrival lands.
  const breath = useSharedValue(0);

  useEffect(() => {
    arrive.value = withDelay(
      delay,
      // out(cubic): fast at the start, settling rather than easing in and out.
      // A card turned by a hand does not decelerate into the beginning.
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    breath.value = withDelay(
      delay + 900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => { cancelAnimation(arrive); cancelAnimation(breath); };
  }, [arrive, breath, delay]);

  const mark = useAnimatedStyle(() => {
    const t = arrive.value;
    // Starts edge-on-ish rather than fully reversed: a full 180 shows the back
    // of a flat SVG, which is the same drawing mirrored and reads as a glitch.
    const deg = (1 - t) * 96;
    const face = Math.cos((deg * Math.PI) / 180);
    return {
      // Fades on the turn, not on a timer, so it is invisible exactly while it
      // is edge-on and there is nothing to see.
      opacity: Math.max(0, face),
      transform: [
        { perspective: size * 9 },
        { translateY: (1 - t) * 16 },
        { rotateY: `${deg}deg` },
        { scale: 0.9 + t * 0.1 },
      ],
    };
  });

  const glow = useAnimatedStyle(() => ({
    opacity: arrive.value * (0.30 + breath.value * 0.20),
    transform: [{ scale: 0.7 + arrive.value * 0.3 + breath.value * 0.06 }],
  }));

  return (
    <View style={[s.markWrap, { width: size * 2.4, height: size * 1.7 }]} pointerEvents="none">
      {/* Bloom sets absoluteFill on its own <Svg> as well as taking a size,
          so nesting it in an absoluteFill parent stretched the square gradient
          into the parent's rectangle — which is why the glow sat low and small
          instead of centred behind the mark. It gets a square of its own. */}
      <Animated.View
        style={[s.center, glow, { position: "absolute", width: size * 2.4, height: size * 2.4 }]}
      >
        <Bloom size={size * 2.4} color={colors.accent} opacity={1} />
      </Animated.View>
      <Animated.View style={mark}>
        <Mark size={size} onDark={onDark} />
      </Animated.View>
    </View>
  );
}

/** Mark + "GrailMarket". `onDark` picks the variant drawn for a dark ground. */
export function Lockup({ width = 190, onDark = false }: { width?: number; onDark?: boolean }) {
  const Svg = onDark ? LockupDark : LockupLight;
  // the horizontal artboard is 690x180
  return <Svg width={width} height={(width * 180) / 690} />;
}

/** The store icon, rounded the way the platform rounds it. The source is a
 *  full-bleed square — a baked radius would be rejected at submission — so the
 *  corner is applied here. */
export function AppIcon({ size = 116, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        s.icon,
        shadow.lifted,
        { width: size, height: size, borderRadius: size * 0.2237 },
        style,
      ]}
    >
      <Image
        source={require("../assets/brand/app-icon.png")}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const s = StyleSheet.create({
  icon: { overflow: "hidden", backgroundColor: colors.dark },
  markWrap: { alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
});

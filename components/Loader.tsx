import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withRepeat, withTiming,
} from "react-native-reanimated";
import { Mark } from "./Brand";
import { Txt } from "./Text";
import { colors, space } from "../theme";

/** The wait, as a card being turned over.
 *
 *  The first version was a spinner with the mark parked inside it — a system
 *  loader wearing a logo, which is the most generic thing this screen could
 *  possibly do. This is the gesture the product is actually about: a card
 *  flipping in the hand, front to back and round again.
 *
 *  The mark is held back to a grey so it reads as waiting rather than as
 *  branding shouted at you, and it dims through the edge-on moment because a
 *  card seen edge-on nearly disappears. That dip is the whole trick — without
 *  it the flip looks like a logo being squashed. */
export function Loader({
  size = 84, label, onDark = false, fill = false,
}: {
  size?: number; label?: string; onDark?: boolean;
  /** Fill the space the content would have taken, and sit in the middle of
   *  it. A loader pinned to the top of an empty screen reads as a page that
   *  half-arrived; in the middle it reads as a page on its way. */
  fill?: boolean;
}) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(
      // Not linear: a real card is slowest face-on and whips through the
      // edge, which is what the cubic in-out does to the middle of the turn.
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
    return () => cancelAnimation(turn);
  }, [turn]);

  const flip = useAnimatedStyle(() => {
    const deg = turn.value * 360;
    // 1 face-on, 0 edge-on — the same curve drives the fade and the squeeze
    const face = Math.abs(Math.cos((deg * Math.PI) / 180));
    return {
      opacity: 0.22 + face * 0.5,
      transform: [
        { perspective: size * 8 },
        { rotateY: `${deg}deg` },
        { scale: 0.92 + face * 0.08 },
      ],
    };
  });

  const shadow = useAnimatedStyle(() => {
    const face = Math.abs(Math.cos((turn.value * 360 * Math.PI) / 180));
    return {
      opacity: 0.05 + face * 0.12,
      transform: [{ scaleX: 0.5 + face * 0.5 }],
    };
  });

  return (
    <View
      style={[s.wrap, fill && { flex: 1, minHeight: Dimensions.get("window").height * 0.52 }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Loading"}
    >
      <Animated.View style={flip}>
        <Mark size={size} onDark={onDark} />
      </Animated.View>
      {/* the ground the card turns above, so it is not floating in nothing */}
      <Animated.View
        style={[s.shadow, { width: size * 0.8, backgroundColor: onDark ? colors.onDark : colors.ink }, shadow]}
      />
      {label && (
        <Txt variant="bodySmall" color={onDark ? colors.onDarkMuted : colors.inkFaint} center
          style={{ marginTop: space.md }}>
          {label}
        </Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  shadow: { height: 5, borderRadius: 3, marginTop: 14 },
});

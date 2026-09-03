import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { CardArt } from "./CardArt";
import { Mark } from "./Brand";
import { colors } from "../theme";

/** A card being turned face-up.
 *
 *  Opening a card used to be a picture fading in, which is what a web page
 *  does. This is a card game: you turn a card over, and the half-second where
 *  you cannot see it yet is the whole feeling. So the page opens on the back
 *  of the card and turns it.
 *
 *  Two faces on one axis. The back is shown while the rotation is past
 *  ninety degrees and the front after — swapping at exactly the edge, where
 *  neither is visible, so the change is never seen happening. Trying to do
 *  this with one face and a texture swap is what makes a flip look like a
 *  glitch.
 */
export function CardReveal({
  uri, width = 190, height = 264, style,
}: {
  uri?: string | null;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withDelay(
      160,
      // out(cubic): a hand turning a card is fastest at the start and settles.
      // inOut would ease INTO the movement, which reads as hesitant.
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(turn);
  }, [turn]);

  // The arithmetic is inlined into each worklet rather than shared through a
  // helper. A useAnimatedStyle body runs on the UI thread, and a plain JS
  // function called from there is not a worklet — Reanimated cannot cross
  // that boundary and the process aborts. It is a native SIGABRT with no JS
  // stack, so it reads as the app dying at random rather than as a mistake in
  // one component.
  const back = useAnimatedStyle(() => {
    const d = 180 - turn.value * 180;
    return {
      opacity: d > 90 ? 1 : 0,
      transform: [
        { perspective: width * 6 },
        { rotateY: `${d}deg` },
        // The card is mirrored past the edge, so its own face has to be
        // flipped back or the artwork on the back reads reversed.
        { scaleX: -1 },
      ],
    };
  });

  const front = useAnimatedStyle(() => {
    const d = 180 - turn.value * 180;
    return {
      opacity: d <= 90 ? 1 : 0,
      transform: [{ perspective: width * 6 }, { rotateY: `${d}deg` }],
    };
  });

  // A card lifts off the table as it turns and settles back down. Without it
  // the flip happens on a flat plane and reads as a texture change.
  const lift = useAnimatedStyle(() => {
    const t = turn.value;
    const arc = Math.sin(t * Math.PI);
    return { transform: [{ translateY: -arc * 10 }, { scale: 0.96 + t * 0.04 }] };
  });

  return (
    <Animated.View style={[{ width, height }, lift, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, s.face, back]}>
        <LinearGradient
          colors={["#31465C", colors.dark, "#0C151E"]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.edge} />
        <View style={s.markSlot}>
          <Mark size={width * 0.4} onDark />
        </View>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, s.face, front]}>
        <CardArt uri={uri} resizeMode="contain" iconSize={22} />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  face: {
    borderRadius: 12, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
    // backfaceVisibility is not honoured on every platform here, so which
    // face shows is decided by opacity above rather than trusted to it.
    backfaceVisibility: "hidden",
    shadowColor: "#0B1622", shadowOpacity: 0.22, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(168,141,96,0.5)",
  },
  markSlot: { flex: 1, alignItems: "center", justifyContent: "center" },
});

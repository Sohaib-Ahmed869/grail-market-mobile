import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Mark } from "./Brand";
import { colors } from "../theme";

/** A hand of cards, fanned, dealing itself.
 *
 *  This replaced a dark rounded panel with the logo centred in it. That shape
 *  is the default any layout falls into when nobody decides what the picture
 *  should be — a box, some rings, a mark. It says nothing about what the
 *  product is, and every app has one.
 *
 *  A card is what the product is. So the artwork is three of them, fanned the
 *  way a hand is fanned, with no container at all: they sit on the page and
 *  cast their own shadow, which is what makes them read as objects rather
 *  than as an illustration inside a frame.
 *
 *  They deal in on mount — outer cards rotating out from behind the middle
 *  one — because a fan that was always fanned is a picture, and a fan that
 *  arrives is a hand.
 */
export function CardFan({ size = 148 }: { size?: number }) {
  const deal = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    deal.value = withDelay(
      140,
      withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) }),
    );
    float.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => { cancelAnimation(deal); cancelAnimation(float); };
  }, [deal, float]);

  const w = size;
  const h = size * 1.4;

  // The two behind. They start stacked under the middle card and rotate out,
  // so the fan opens rather than fading in already open.
  // Named use* because it calls a hook. Called twice, unconditionally, in a
  // fixed order — which is what the rule actually requires.
  //
  // The pivot is the trick. Rotating a card about its own centre slides it
  // sideways and the three end up overlapping in a stack; a real fan turns
  // about a point below the hand. Translating down, rotating, then translating
  // back up puts the pivot there, which is what makes the tops splay while the
  // bottoms stay gathered.
  const useSideStyle = (dir: -1 | 1, angle: number) =>
    useAnimatedStyle(() => {
      const t = deal.value;
      const pivot = h * 0.72;
      return {
        opacity: t,
        transform: [
          { translateY: pivot },
          { rotate: `${t * angle * dir}deg` },
          { translateY: -pivot },
          { translateY: float.value * 3 * dir },
          { scale: 0.94 },
        ],
      };
    });

  const left = useSideStyle(-1, 21);
  const right = useSideStyle(1, 21);

  const centre = useAnimatedStyle(() => ({
    opacity: deal.value,
    transform: [
      { translateY: (1 - deal.value) * 18 - float.value * 4 },
      { scale: 0.96 + deal.value * 0.04 },
    ],
  }));

  const glow = useAnimatedStyle(() => ({
    opacity: deal.value * (0.5 + float.value * 0.25),
  }));

  return (
    <View style={[s.stage, { width: w * 2.3, height: h * 1.3 }]} pointerEvents="none">
      {/* The ground. Without it the cards float in nothing and the whole
          group reads as pasted on. */}
      <Animated.View style={[s.glow, { width: w * 2, height: h }, glow]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="fanGlow" cx="50%" cy="60%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.30} />
              <Stop offset="0.5" stopColor={colors.accent} stopOpacity={0.10} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#fanGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[s.card, { width: w, height: h }, left]}>
        <Back w={w} h={h} />
      </Animated.View>
      <Animated.View style={[s.card, { width: w, height: h }, right]}>
        <Back w={w} h={h} />
      </Animated.View>

      <Animated.View style={[s.card, s.front, { width: w, height: h }, centre]}>
        <LinearGradient
          colors={["#2C3E52", colors.dark]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The gold hairline is the slab edge — the one detail that says this
            is a graded card and not a playing card. */}
        <View style={s.edge} />
        <View style={s.markSlot}>
          <Mark size={w * 0.42} onDark />
        </View>
      </Animated.View>
    </View>
  );
}

/** The ones behind: lighter, plainer, and deliberately featureless. They are
 *  the rest of the hand, not three logos. */
function Back({ w, h }: { w: number; h: number }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Slate, not near-white. On a #FAFBFC page a white card back has
          nothing to separate it from the ground and reads as the front card's
          shadow rather than as another card. */}
      <LinearGradient
        colors={["#8FA0B2", "#5F7285"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.backInner, { margin: w * 0.085, borderRadius: w * 0.05 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  card: {
    position: "absolute", borderRadius: 14, overflow: "hidden",
    backgroundColor: colors.surface,
    shadowColor: "#0B1622", shadowOpacity: 0.20, shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  front: {
    shadowOpacity: 0.30, shadowRadius: 26, shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(168,141,96,0.55)",
  },
  markSlot: { flex: 1, alignItems: "center", justifyContent: "center" },
  backInner: {
    flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

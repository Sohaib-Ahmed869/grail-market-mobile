import { useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

const W = 132;
const H = Math.round(W * 660 / 480); // the art's own ratio, so nothing is squashed

/** Where each card ends up once the stack opens. Depth is carried by scale and
 *  dim rather than by a blur, which is expensive on a phone and reads the same
 *  at this size. */
const CARDS = [
  {
    key: "left", src: require("../assets/cards/charizard-base.jpg"),
    grade: "PSA 9", x: -108, rot: -15, scale: 0.9, dim: 0.34, delay: 120, z: 1,
  },
  {
    key: "right", src: require("../assets/cards/charizard-151.jpg"),
    grade: "PSA 10", x: 108, rot: 15, scale: 0.9, dim: 0.34, delay: 60, z: 1,
  },
  {
    key: "centre", src: require("../assets/cards/umbreon-vmax.jpg"),
    grade: "PSA 10", x: 0, rot: 0, scale: 1, dim: 0, delay: 0, z: 2,
  },
] as const;

/** The hero: a stack of slabs that opens sideways.
 *
 *  Everything starts squared up in the middle as one pile, then the outer two
 *  slide out and rotate while the middle one settles forward. It is the
 *  gesture of fanning a deck, which is the thing the app is about, and it
 *  reads in the half second someone spends on this screen.
 *
 *  Real card photographs, not drawn placeholders — the whole promise is that
 *  we know exactly which printing you are holding, and generic rectangles
 *  undercut that on the first screen. */
export function HeroCards({ style }: { style?: StyleProp<ViewStyle> }) {
  const open = useSharedValue(0);

  useEffect(() => {
    open.value = withDelay(
      260,
      withTiming(1, { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
  }, [open]);

  return (
    <View style={[s.wrap, style]} pointerEvents="none">
      {CARDS.map((c) => (
        <Card key={c.key} card={c} open={open} />
      ))}
    </View>
  );
}

function Card({ card, open }: { card: (typeof CARDS)[number]; open: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // each card runs the same curve on its own slice of the window, so the
    // middle lands first and the outer two follow it out
    const t = interpolate(open.value, [card.delay / 1000, 1], [0, 1], "clamp");
    return {
      opacity: interpolate(t, [0, 0.25, 1], [0, 1, 1]),
      transform: [
        { translateY: interpolate(t, [0, 1], [26, 0]) },
        { translateX: interpolate(t, [0, 1], [0, card.x]) },
        { rotate: `${interpolate(t, [0, 1], [0, card.rot])}deg` },
        { scale: interpolate(t, [0, 1], [0.82, card.scale]) },
      ],
    };
  });

  return (
    <Animated.View style={[s.card, { zIndex: card.z }, style]}>
      {/* the art is clipped by its own frame, so the badge can still sit
          outside the card edge the way a slab label does */}
      <View style={s.artFrame}>
        <Image source={card.src} style={s.art} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      {/* the slab label: what the app actually sells is the grade on the case */}
      <View style={s.badge}>
        <Txt variant="overline" color={colors.ink} style={s.badgeTxt}>{card.grade}</Txt>
      </View>
      {card.dim > 0 && <View style={[s.dim, { opacity: card.dim }]} />}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", height: H + 34, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  card: {
    position: "absolute", width: W, height: H, borderRadius: radius.sm,
    backgroundColor: colors.surface, padding: 4,
    shadowColor: "#000", shadowOpacity: 0.42, shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  // stated dimensions, not flex: on react-native-web an Image with intrinsic
  // size ignores flex and lays out at its natural 480x660, which spilled the
  // artwork clean across the hero
  artFrame: { flex: 1, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  art: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", top: 9, left: -5,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  badgeTxt: { fontSize: 8, letterSpacing: 0.9 },
  dim: { ...StyleSheet.absoluteFillObject, borderRadius: radius.sm, backgroundColor: colors.dark },
});

import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Mark } from "./Brand";
import { Txt } from "./Text";
import { colors, space, type } from "../theme";

/** The thing you just became, as an object.
 *
 *  A tick in a circle says "the form submitted". It is the same picture every
 *  app draws for a saved setting, and it is what made this screen look like a
 *  template. What actually happened is that somebody joined a marketplace for
 *  graded cards — so they get a card.
 *
 *  The sheen is the detail that makes it one. Gold foil catches the light when
 *  you tilt a slab, and a band travelling across the face once on arrival is
 *  that, not a pulse or a glow. It is the only thing on the screen that moves,
 *  and it moves once.
 */
export function MemberCard({ name, since }: { name: string; since?: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - space.xl * 2, 360);
  // The proportion of a real membership card, not an arbitrary rectangle.
  const h = w / 1.585;

  const deal = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    deal.value = withDelay(
      100,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
    // Once on arrival, then rarely. A foil that flashes on a loop is a
    // hologram sticker; one that catches the light now and then is a card.
    sheen.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 4200 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => { cancelAnimation(deal); cancelAnimation(sheen); };
  }, [deal, sheen]);

  const card = useAnimatedStyle(() => ({
    opacity: deal.value,
    transform: [
      { perspective: 900 },
      // Arrives tilted and settles flat, the way a card comes to rest after
      // being put down. A straight fade-in is a picture appearing.
      { rotateX: `${(1 - deal.value) * 14}deg` },
      { translateY: (1 - deal.value) * 22 },
      { scale: 0.94 + deal.value * 0.06 },
    ],
  }));

  const band = useAnimatedStyle(() => ({
    opacity: sheen.value > 0 && sheen.value < 1 ? 1 : 0,
    transform: [{ translateX: -w + sheen.value * w * 2.2 }, { rotate: "18deg" }],
  }));

  return (
    <Animated.View style={[s.wrap, { width: w, height: h }, card]}>
      <LinearGradient
        colors={["#31465C", colors.dark, "#0C151E"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* The foil edge. A slab's label is the only gold on it, so this is the
          only gold here too. */}
      <View style={s.edge} />

      <Animated.View style={[s.sheen, { width: w * 0.42, height: h * 2 }, band]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.16)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={s.body}>
        <View style={s.top}>
          <Mark size={26} onDark />
          <Txt variant="bodySmall" color={colors.accent}>Verified member</Txt>
        </View>

        <View>
          <Txt style={s.name} color={colors.onDark} numberOfLines={1}>{name}</Txt>
          <Txt variant="bodySmall" color={colors.onDarkMuted}>
            Member since {since ?? monthYear()}
          </Txt>
        </View>
      </View>
    </Animated.View>
  );
}

const monthYear = () =>
  new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });

const s = StyleSheet.create({
  wrap: {
    borderRadius: 18, overflow: "hidden",
    shadowColor: "#0B1622", shadowOpacity: 0.3, shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 }, elevation: 14,
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(168,141,96,0.55)",
  },
  sheen: { position: "absolute", top: -20, left: 0 },
  body: { flex: 1, padding: space.lg, justifyContent: "space-between" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { ...type.h1, color: colors.onDark },
});

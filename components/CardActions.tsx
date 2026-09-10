import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Icon } from "./Icon";
import { Txt } from "./Text";
import { colors, space, type } from "../theme";

const APress = Animated.createAnimatedComponent(Pressable);

/** The two things you can do with a card.
 *
 *  FOLLOW behaves the way a follow button behaves everywhere else: filled
 *  and inviting until you tap it, quiet and outlined once you have, and
 *  tapping it again undoes it. The change lands on the tap rather than on
 *  the reply, and the tick springs in — a state that arrives half a second
 *  later reads as a button that did not register.
 *
 *  SELL is the marketplace action, so it says what the thing is worth. A
 *  gold call to action with a figure under it is the shape every listing
 *  flow uses, and the figure is the answer to the only question anybody has
 *  before tapping it.
 *
 *  Both are surfaces rather than filled rectangles: a gradient down the
 *  face, a hairline of light along the top edge, and a shadow tinted with
 *  the button's own colour.
 */
export function CardActions({
  followed, following, onFollow, onSell, selling, worth,
}: {
  followed: boolean;
  following: boolean;
  onFollow: () => void;
  onSell: () => void;
  selling?: boolean;
  /** What the card is worth right now, already formatted and converted.
   *  Null while it is unknown, which is a real state and not a zero. */
  worth?: string | null;
}) {
  const pop = useSharedValue(0);
  useEffect(() => {
    // Only on the way in. Springing on un-follow would celebrate the undo.
    if (followed) pop.value = withSequence(withTiming(1, { duration: 0 }), withSpring(0, { damping: 9, stiffness: 190 }));
  }, [followed]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.35 }] }));

  return (
    <View style={s.row}>
      <Pressable
        onPress={onFollow}
        disabled={following}
        accessibilityRole="button"
        accessibilityState={{ selected: followed, busy: following }}
        accessibilityLabel={followed ? "Following. Tap to unfollow." : "Follow this card"}
        style={({ pressed }) => [s.btn, s.follow, followed && s.followOn, pressed && s.pressed]}
      >
        {!followed && (
          <>
            <LinearGradient
              colors={["#33465A", "#1E2C3A", "#16202B"]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.sheen} pointerEvents="none" />
          </>
        )}
        {following && !followed ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <>
            <Animated.View style={followed ? tick : undefined}>
              {followed
                ? <Feather name="check" size={16} color={colors.accent} />
                : <Icon name="follow" size={18} color={colors.onDark} />}
            </Animated.View>
            <Txt style={[s.label, { color: followed ? colors.accent : colors.onDark }]} numberOfLines={1}>
              {followed ? "Following" : "Follow"}
            </Txt>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={onSell}
        disabled={selling}
        accessibilityRole="button"
        accessibilityLabel={worth ? `Sell one of these, worth about ${worth}` : "Sell one of these"}
        style={({ pressed }) => [s.btn, s.sell, pressed && s.pressed]}
      >
        <LinearGradient
          colors={["#D8BE8C", "#B99C6C", "#9C8054"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.sheen} pointerEvents="none" />
        <Feather name="tag" size={16} color="#1A1408" />
        <View style={{ minWidth: 0 }}>
          <Txt style={[s.label, { color: "#1A1408" }]} numberOfLines={1}>Sell one</Txt>
          {worth ? (
            <Txt style={s.worth} numberOfLines={1}>{worth} today</Txt>
          ) : null}
        </View>
        <Feather name="arrow-right" size={16} color="rgba(26,20,8,0.5)" style={s.arrow} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  btn: {
    height: 58, borderRadius: 16, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    paddingHorizontal: space.md,
  },
  // The lit top edge. A one-pixel line at 20% white is the difference between
  // a filled rectangle and a surface with a light above it.
  sheen: {
    position: "absolute", top: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  label: { ...type.button, letterSpacing: 0.1 },
  worth: {
    ...type.overline, fontSize: 11.5, lineHeight: 14,
    color: "rgba(26,20,8,0.62)", fontVariant: ["tabular-nums"],
  },
  arrow: { marginLeft: -2 },

  follow: {
    flex: 1, backgroundColor: colors.dark,
    shadowColor: "#16202B", shadowOpacity: 0.30, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  followOn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.accent,
    shadowOpacity: 0, elevation: 0,
  },
  sell: {
    flex: 1.3, backgroundColor: colors.accent,
    shadowColor: "#8A6D3B", shadowOpacity: 0.42, shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 }, elevation: 8,
  },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.94 },
});

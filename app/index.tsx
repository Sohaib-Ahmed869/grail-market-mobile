import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Bloom } from "../components/Bloom";
import { GlassCard } from "../components/GlassCard";
import { Mark, Lockup } from "../components/Brand";
import { Txt } from "../components/Text";
import { colors, space } from "../theme";

// The beats, in milliseconds from the top. Kept in one place because the
// sequence is the design here — read down the list and you have the animation.
const T = {
  card: 0,        // the glass fades and settles
  reveal: 340,    // the mark is wiped in behind it
  lift: 1120,     // the card rises, making room
  word: 1240,     // wordmark and line follow it up
  leave: 2500,    // on to the welcome screen
};
const MARK = 76;

/** Splash.
 *
 *  Four beats, borrowed from the Lovi shot: glass settles, mark reveals
 *  inside it, card lifts, wordmark rises underneath. The reference draws its
 *  logo as a line; ours is a filled mark, so the equivalent is a wipe with a
 *  lit edge riding the boundary — the same read of something being drawn
 *  rather than switched on.
 *
 *  The OS paints its own splash from app.json before any of this exists, so
 *  the first frame here has to match it: same navy, same mark, same size. */
export default function Splash() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const card = useSharedValue(0);
  const wipe = useSharedValue(0);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    card.value = withDelay(T.card, withTiming(1, { duration: 560, easing: ease }));
    wipe.value = withDelay(T.reveal, withTiming(1, { duration: 720, easing: Easing.inOut(Easing.cubic) }));
    lift.value = withDelay(T.lift, withTiming(1, { duration: 620, easing: ease }));
    word.value = withDelay(T.word, withTiming(1, { duration: 560, easing: ease }));
    const t = setTimeout(() => router.replace("/welcome"), T.leave);
    return () => clearTimeout(t);
  }, [card, wipe, lift, word, router]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [
      { scale: interpolate(card.value, [0, 1], [0.86, 1]) },
      { translateY: interpolate(lift.value, [0, 1], [0, -26]) },
    ],
  }));

  // The mark never moves and is never scaled — a logo that stretches during
  // its own reveal is the tell of a cheap one. Instead a clip grows upward
  // from the baseline while the artwork stays pinned to the bottom, so the G
  // is uncovered in place, the way ink arrives on paper.
  const clipStyle = useAnimatedStyle(() => ({ height: wipe.value * MARK }));
  const edgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wipe.value, [0, 0.06, 0.88, 1], [0, 1, 1, 0]),
    transform: [{ translateY: interpolate(wipe.value, [0, 1], [MARK, 0]) }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [18, 0]) }],
  }));

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#26364A", colors.dark, "#101922"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* a warm bloom where the glass sits, so the gold has somewhere to come
          from and the navy is not a flat sheet */}
      <View style={[s.bloom, { width: width * 1.9, height: width * 1.9, top: height * 0.14 }]}>
        <Bloom size={width * 1.9} color={colors.accent} opacity={0.30} />
      </View>

      <View style={s.center}>
        <Animated.View style={cardStyle}>
          <GlassCard size={148}>
            <View style={s.markWindow}>
              <Animated.View style={[s.clip, clipStyle]}>
                <View style={s.markHold}>
                  <Mark size={MARK} onDark />
                </View>
              </Animated.View>
              {/* a lit edge rides the boundary of the reveal */}
              <Animated.View style={[s.edge, edgeStyle]} />
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View style={[s.word, wordStyle]}>
          <Lockup width={182} onDark />
          <Txt variant="bodySmall" color={colors.onDarkMuted} center style={s.tag}>
            Premium collectibles. Trusted transactions.
          </Txt>
        </Animated.View>
      </View>

      <Animated.View style={[s.rule, wordStyle]} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.dark, overflow: "hidden" },
  bloom: { position: "absolute", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  markWindow: { width: MARK, height: MARK, overflow: "hidden", justifyContent: "flex-end" },
  clip: { width: MARK, overflow: "hidden", justifyContent: "flex-end" },
  markHold: { height: MARK, justifyContent: "flex-end" },
  edge: {
    position: "absolute", left: -6, right: -6, height: 2, borderRadius: 1,
    backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  word: { marginTop: space.xxl + space.sm, alignItems: "center" },
  tag: { marginTop: space.md, letterSpacing: 0.2 },
  rule: {
    position: "absolute", bottom: 26, alignSelf: "center",
    width: 104, height: 4, borderRadius: 2, backgroundColor: colors.accent,
  },
});

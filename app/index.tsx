import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "../components/BrandMark";
import { Wordmark } from "../components/Wordmark";
import { colors, space } from "../theme";

/** Splash.
 *
 *  This is the second splash the user sees. The first is the native one the
 *  OS draws from app.json before any JavaScript exists; it shows the same mark
 *  on the same navy, so the handover is invisible and the app appears to hold
 *  one screen while it starts. */
export default function Splash() {
  const { height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={s.root}>
      {/* barely there: a lift behind the mark so the navy is not flat */}
      <LinearGradient
        colors={["#16263A", colors.background, "#0B1521"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            s.center,
            { opacity: fade, transform: [{ translateY: rise }], marginTop: -height * 0.06 },
          ]}
        >
          <BrandMark size={132} />
          <Wordmark size={26} style={s.word} />
        </Animated.View>

        {/* the gold rule the design puts at the foot of the screen */}
        <Animated.View style={[s.rule, { opacity: fade }]} />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  word: { marginTop: space.xl },
  rule: {
    position: "absolute",
    bottom: space.md,
    width: 118,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});

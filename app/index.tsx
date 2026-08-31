import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AppIcon, Lockup } from "../components/Brand";
import { colors, space } from "../theme";

const HOLD_MS = 1500;
// react-native-web has no native animation driver.
const NATIVE = Platform.OS !== "web";

/** Splash.
 *
 *  The second one the user sees. The first is drawn by the OS from app.json
 *  before any JavaScript exists; it shows the same mark on the same navy, so
 *  the handover is invisible and the app appears to hold a single screen while
 *  it starts rather than flashing twice.
 *
 *  Nothing here fades in from nothing. The mark is at full opacity on the
 *  first frame and the animation only settles it — a brand screen that depends
 *  on an animation completing in order to show the brand has a failure mode
 *  where the user stares at an empty navy rectangle, and that is a poor trade
 *  for a fade nobody asked for. Motion is polish, never the thing carrying
 *  visibility. */
export default function Splash() {
  const router = useRouter();
  const settle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(settle, {
      toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE,
    }).start();
    const t = setTimeout(() => router.replace("/welcome"), HOLD_MS);
    return () => clearTimeout(t);
  }, [settle, router]);

  const rise = settle.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const grow = settle.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <View style={s.root}>
      {/* the navy is not flat: a slow lift behind the mark, dark at the edges */}
      <LinearGradient
        colors={["#22303E", colors.dark, "#131D27"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.center}>
        <Animated.View style={{ transform: [{ translateY: rise }, { scale: grow }] }}>
          <AppIcon size={116} />
        </Animated.View>
        <Animated.View style={[s.word, { transform: [{ translateY: rise }] }]}>
          <Lockup width={188} onDark />
        </Animated.View>
      </View>
      <View style={s.rule} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark },
  center: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: -space.xxxl },
  word: { marginTop: space.xxl },
  rule: {
    position: "absolute", bottom: 26, alignSelf: "center",
    width: 104, height: 4, borderRadius: 2, backgroundColor: colors.accent,
  },
});

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Lockup } from "../components/Brand";
import { Bloom } from "../components/Bloom";
import { CardRibbon } from "../components/CardRibbon";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { colors, space } from "../theme";

/** Welcome.
 *
 *  One claim, one ribbon, one action. The three-point feature list from the
 *  wireframe is gone — someone deciding whether to install looks at the
 *  pictures and presses the button, and those points are more use where they
 *  actually apply, on the levels screen and beside the scan.
 *
 *  The words are the wireframe's own, cut to two lines. The ID requirement
 *  stays on this screen because it is the product's whole proposition, and
 *  springing it later is what makes people abandon halfway through signup. */
export default function Welcome() {
  const router = useRouter();
  const enter = useSharedValue(0);
  const tail = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    enter.value = withDelay(120, withTiming(1, { duration: 620, easing: ease }));
    tail.value = withDelay(760, withTiming(1, { duration: 620, easing: ease }));
  }, [enter, tail]);

  const headStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [16, 0]) }],
  }));
  const tailStyle = useAnimatedStyle(() => ({
    opacity: tail.value,
    transform: [{ translateY: interpolate(tail.value, [0, 1], [22, 0]) }],
  }));

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#26364A", colors.dark, "#0E1720"]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.bloom}>
        <Bloom size={620} color={colors.accent} opacity={0.26} />
      </View>

      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.top}>
          <Lockup width={148} onDark />
        </View>

        <Animated.View style={[s.head, headStyle]}>
          <Txt variant="display" color={colors.onDark} center style={s.h1}>
            Australia&rsquo;s marketplace{"\n"}for{" "}
            <Txt variant="display" color={colors.accent} style={s.h1}>slabs &amp; sealed</Txt>.
          </Txt>
        </Animated.View>

        {/* the band runs off both edges on purpose — it should read as
            continuing, not as nine cards in a row */}
        <CardRibbon style={s.ribbon} />

        <Animated.View style={[s.bottom, tailStyle]}>
          <Txt variant="body" color={colors.onDarkMuted} center style={s.sub}>
            Price checks are free. Buying and selling needs a verified ID.
          </Txt>
          <Button label="Create an account" kind="accent" onPress={() => router.push("/signup")} />
          <Button
            label="Look around first — no account"
            kind="ghostLight"
            onPress={() => {}}
            style={s.ghost}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.dark, overflow: "hidden" },
  bloom: { position: "absolute", alignSelf: "center", top: "18%", width: 620, height: 620 },
  safe: { flex: 1, width: "100%", justifyContent: "space-between" },
  top: { alignItems: "center", paddingTop: space.md },
  head: { paddingHorizontal: space.xl },
  h1: { letterSpacing: -0.9, lineHeight: 38 },
  ribbon: { marginVertical: space.sm },
  bottom: { width: "100%", paddingHorizontal: space.xl, paddingBottom: space.sm },
  sub: { marginBottom: space.xl, paddingHorizontal: space.sm },
  ghost: { marginTop: space.xs },
});

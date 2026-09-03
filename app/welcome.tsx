import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Lockup } from "../components/Brand";
import { Bloom } from "../components/Bloom";
import { CardRibbon } from "../components/CardRibbon";
import { enterGuest } from "../lib/guest";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { colors, radius, space } from "../theme";
import { StatusBar } from "expo-status-bar";

/** Three claims, one line each.
 *
 *  The wireframe gave each of these a card and two sentences. On the screen
 *  someone spends two seconds on, that is three paragraphs nobody finishes —
 *  the title carries the claim and the tail only has to stop it being vague.
 *  The long versions still exist where they are useful: the levels screen
 *  explains what ID opens, and the scan screen explains what a scan reads. */
const POINTS = [
  { icon: "maximize" as const, title: "Scan, and know", tail: "market value in seconds" },
  { icon: "shield" as const, title: "Everyone is ID checked", tail: "no anonymous accounts" },
  { icon: "message-circle" as const, title: "Deal person to person", tail: "we never hold your money" },
];

export default function Welcome() {
  const router = useRouter();
  const enter = useSharedValue(0);
  const tail = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    enter.value = withDelay(120, withTiming(1, { duration: 620, easing: ease }));
    tail.value = withDelay(700, withTiming(1, { duration: 620, easing: ease }));
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
      {/* Navy from edge to edge, so the clock has to be white. */}
      <StatusBar style="light" />
      <LinearGradient
        colors={["#26364A", colors.dark, "#0E1720"]}
        locations={[0, 0.44, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.bloom}>
        <Bloom size={560} color={colors.accent} opacity={0.24} />
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
            continuing, not as seven cards in a row */}
        <CardRibbon style={s.ribbon} />

        <Animated.View style={[s.mid, tailStyle]}>
          <View style={s.points}>
            {POINTS.map((p) => (
              <View key={p.title} style={s.point}>
                <View style={s.chip}>
                  <Feather name={p.icon} size={14} color={colors.accent} />
                </View>
                <Txt variant="bodySmall" color={colors.onDark} style={s.pointTxt}>
                  {p.title}
                  <Txt variant="bodySmall" color={colors.onDarkMuted}>{"  ·  "}{p.tail}</Txt>
                </Txt>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* the actions stay pinned to the bottom; the points ride up with the
            ribbon so the two are read as one block */}
        <Animated.View style={[s.actions, tailStyle]}>
          <Button label="Create an account" kind="accent" onPress={() => router.push("/signup")} />
          <Button
            label="Look around first — no account"
            kind="ghostLight"
            onPress={async () => { await enterGuest(); router.replace("/(tabs)/home"); }}
            style={s.ghost}
          />
          <Pressable onPress={() => router.push("/signin")} hitSlop={8} style={s.signin}>
            <Txt variant="bodySmall" color={colors.onDarkMuted} center>
              Already a member?{" "}
              <Txt variant="bodySmall" color={colors.onDark} style={{ fontWeight: "600" }}>
                Sign in
              </Txt>
            </Txt>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.dark, overflow: "hidden" },
  bloom: { position: "absolute", alignSelf: "center", top: "10%", width: 560, height: 560 },
  // laid out from the top rather than spread, so the ribbon sits high and the
  // block underneath keeps a fixed relationship to the buttons
  safe: { flex: 1, width: "100%" },
  top: { alignItems: "center", paddingTop: space.md },
  head: { paddingHorizontal: space.xl, marginTop: space.xxl },
  h1: { letterSpacing: -0.9, lineHeight: 38 },
  ribbon: { marginTop: space.xl },
  mid: { width: "100%", paddingHorizontal: space.xl, marginTop: space.xxl },
  actions: {
    width: "100%", marginTop: "auto",
    paddingHorizontal: space.xl, paddingBottom: space.sm,
  },
  points: { gap: space.md, paddingHorizontal: space.xs },
  point: { flexDirection: "row", alignItems: "center", gap: space.md },
  chip: {
    width: 30, height: 30, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  pointTxt: { flex: 1 },
  ghost: { marginTop: space.xs },
  signin: { marginTop: space.md },
});

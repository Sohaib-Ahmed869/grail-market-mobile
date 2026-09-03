import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { CardFan } from "./CardFan";
import { Txt } from "./Text";
import { Button } from "./Button";
import { useHideNav } from "../lib/navbar";
import { colors, radius, space } from "../theme";

/** What a guest sees where a member's screen would be.
 *
 *  Browsing needs no account and scanning does — not as a growth tactic but
 *  because a scan costs a paid lookup and a collection has to belong to
 *  somebody. So the gate says which of those it is, rather than "sign in to
 *  continue", and it never pretends the feature is broken.
 *
 *  It takes the whole screen, tab bar included. This is one decision, and a
 *  row of five destinations under it says the opposite — that this is a page
 *  among pages you might tab past. The way out is the arrow at the top, which
 *  is the only navigation a page like this needs.
 *
 *  There is no hero PANEL. A dark rounded box with the logo centred in it is
 *  where any layout lands when nobody decides what the picture should be, and
 *  every app has one. The picture here is a hand of cards, sitting on the page
 *  and casting its own shadow — which is the product, and is not a box.
 */
export function JoinGate({
  icon, title, why, points,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  why: string;
  points: string[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  useHideNav();

  // The hero gets whatever is left after the copy and the actions, within
  // reason. On a small phone it shrinks rather than pushing the buttons off;
  // on a large one it does not become a poster.
  const heroH = Math.max(200, Math.min(300, height * 0.32));

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.fill}>
        <View style={s.topBar}>
          <Pressable
            onPress={() => router.replace("/(tabs)/home")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to browsing"
            style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
          >
            <Feather name="arrow-left" size={19} color={colors.ink} />
          </Pressable>
          <Txt variant="bodySmall" color={colors.inkFaint}>Guest</Txt>
        </View>

        <View style={s.body}>
          {/* ---- the hero -------------------------------------------------- */}
          <View style={[s.hero, { height: heroH }]}>
            <CardFan size={Math.min(132, heroH * 0.52)} />
          </View>

          {/* ---- what and why ---------------------------------------------- */}
          <Animated.View entering={FadeInDown.duration(440).delay(160)} style={s.copy}>
            <Txt variant="display" center>{title}</Txt>
            <Txt variant="body" color={colors.inkMuted} center style={s.why}>
              {why}
            </Txt>
          </Animated.View>

          {/* ---- what you get ----------------------------------------------- */}
          <Animated.View entering={FadeInDown.duration(440).delay(280)} style={s.points}>
            {points.map((p, i) => (
              <View key={p} style={[s.point, i > 0 && s.pointDivided]}>
                <View style={s.tick}>
                  <Feather name="check" size={11} color={colors.up} />
                </View>
                <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>{p}</Txt>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* ---- the decision ------------------------------------------------ */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(380)}
          style={[s.foot, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}
        >
          <Button label="Create an account" pill onPress={() => router.push("/signup")} />
          {/* A link, not a second button. Two bordered boxes give both choices
              equal weight when one of them is plainly the answer for most
              people standing here. */}
          <Button label="I already have an account" kind="link" onPress={() => router.push("/signin")} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  fill: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: space.sm,
  },
  back: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  body: { flex: 1, paddingHorizontal: space.xl, justifyContent: "center", gap: space.xl },
  hero: { alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center" },
  why: { marginTop: space.sm, paddingHorizontal: space.sm },
  points: {
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: space.lg,
  },
  point: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  // Hairlines between rather than gaps: three floating rows in a box read as
  // three things that happen to be near each other.
  pointDivided: { borderTopWidth: 1, borderTopColor: colors.line },
  tick: {
    width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.upWash,
  },
  foot: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 2 },
});

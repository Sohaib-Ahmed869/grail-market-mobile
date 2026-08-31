import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Lockup } from "../components/Brand";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { CardFan } from "../components/CardFan";
import { colors, radius, space } from "../theme";

const POINTS = [
  { icon: "maximize" as const, title: "Scan, and know",
    body: "Point your camera at a card and get its real market value in seconds." },
  { icon: "shield" as const, title: "Everyone is ID checked",
    body: "A licence or two forms of ID before anyone can buy or sell. No anonymous accounts." },
  { icon: "message-circle" as const, title: "Deal person to person",
    body: "Message, agree, then meet or post. GrailMarket never holds your money." },
];

/** Welcome.
 *
 *  The ID requirement is stated here rather than sprung at the moment someone
 *  tries to list. It is the product's whole proposition, so it leads. */
export default function Welcome() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  return (
    <View style={s.root}>
      <LinearGradient colors={["#22303E", colors.dark]} style={[s.hero, { height: height * 0.34 }]}>
        <SafeAreaView edges={["top"]} style={s.heroInner}>
          <Lockup width={158} onDark />
          <CardFan style={s.fan} />
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView edges={["bottom"]} style={s.sheet}>
        <View style={s.body}>
          <Txt variant="display">
            Australia&rsquo;s marketplace{"\n"}for <Txt variant="display" color={colors.accent}>slabs &amp; sealed</Txt>.
          </Txt>
          <Txt variant="body" color={colors.inkMuted} style={s.lede}>
            Price checks are free and open. Buying and selling needs a verified identity —
            that&rsquo;s the whole point.
          </Txt>

          <View style={s.points}>
            {POINTS.map((p) => (
              <View key={p.title} style={s.point}>
                <View style={s.pointIcon}>
                  <Feather name={p.icon} size={16} color={colors.ink} />
                </View>
                <View style={s.pointText}>
                  <Txt variant="h3">{p.title}</Txt>
                  <Txt variant="bodySmall" color={colors.inkMuted}>{p.body}</Txt>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.actions}>
          <Button label="Create an account" onPress={() => router.push("/signup")} />
          <Button label="Look around first — no account" kind="ghost" onPress={() => {}} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.dark },
  hero: { justifyContent: "flex-start", overflow: "hidden" },
  heroInner: { flex: 1, alignItems: "center", paddingTop: space.sm },
  fan: { position: "absolute", top: 58 },
  // the sheet overlaps the hero, so the card fan tucks behind it
  sheet: {
    flex: 1, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -radius.xl, paddingTop: space.xxl, width: "100%",
  },
  body: { flex: 1, width: "100%", paddingHorizontal: space.xl },
  lede: { marginTop: space.md },
  points: { marginTop: space.xxl, gap: space.lg },
  point: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  pointIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  pointText: { flex: 1, minWidth: 0, gap: 3 },
  actions: { width: "100%", paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.xs },
});

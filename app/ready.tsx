import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { useSession } from "../lib/session";
import { colors, space, type } from "../theme";

/** What the last ten minutes bought, named rather than described.
 *
 *  "Buy, sell and message other members" is a feature list. These are
 *  permissions that did not exist an hour ago, which is what actually
 *  changed. */
const OPENS = [
  ["List cards", "With the Seller Verified badge on every one"],
  ["Make offers", "And message the person on the other end"],
  ["Keep your scans", "Saved to a collection that follows you"],
];

/** You're in.
 *
 *  No illustration. A tick radiating rings, a membership card and a slab were
 *  all tried, and every one of them was a decoration standing in for the
 *  moment rather than being it — the screen ended up about the graphic.
 *
 *  What carries it instead is the person's own name at display size, and a
 *  lot of air. The only ornament is a hairline rule and a gold word, because
 *  a screen that says one thing should look like it is saying one thing.
 */
export default function Ready() {
  const router = useRouter();
  const session = useSession();
  const first = (session?.name ?? "").trim().split(" ")[0] || null;

  useEffect(() => {
    // A success tap, once. This is the half of it you feel, and with no
    // graphic doing the celebrating it is carrying more than it was.
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const H = require("expo-haptics") as typeof import("expo-haptics");
        await H.notificationAsync(H.NotificationFeedbackType.Success);
      } catch {
        /* no haptics on this device — the screen still works */
      }
    })();
  }, []);

  return (
    <Screen
      footer={
        <Animated.View entering={FadeInDown.duration(420).delay(620)}>
          <Button label="Scan your first card" onPress={() => router.replace("/(tabs)/scan")} />
          <Button
            label="Look around first"
            kind="link"
            onPress={() => router.replace("/(tabs)/home")}
          />
        </Animated.View>
      }
    >
      <View style={s.body}>
        <Animated.View entering={FadeIn.duration(420)}>
          <Txt style={s.eyebrow} color={colors.accent}>Verified</Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(520).delay(120)}>
          <Txt style={s.huge}>
            You&rsquo;re in{first ? "," : "."}
          </Txt>
          {first && <Txt style={s.huge}>{first}.</Txt>}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(460).delay(260)}>
          <Txt variant="body" color={colors.inkMuted} style={s.sub}>
            Your ID checked out and your plan is live. Three things opened up.
          </Txt>
        </Animated.View>

        <View style={s.rule} />

        <View>
          {OPENS.map(([title, body], i) => (
            <Animated.View
              key={title}
              entering={FadeInDown.duration(400).delay(380 + i * 80)}
              style={[s.row, i > 0 && s.divided]}
            >
              <Txt style={s.n} color={colors.inkFaint}>{String(i + 1).padStart(2, "0")}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{title}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{body}</Txt>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  // Top-aligned with air above it, not centred. Centring a block this tall
  // leaves it floating with nothing anchoring it to either edge.
  body: { flex: 1, paddingTop: space.xxxl },
  eyebrow: { ...type.button, letterSpacing: 0.2 },
  // Bigger than `display`, and set on two lines so a long first name does not
  // shrink the greeting to fit. This is the largest type in the app and the
  // only place that earns it.
  huge: { ...type.display, fontSize: 40, lineHeight: 45, letterSpacing: -1, color: colors.ink },
  sub: { marginTop: space.md, maxWidth: 320 },
  rule: { height: 1, backgroundColor: colors.line, marginTop: space.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingVertical: space.lg },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  // A number, not a bullet or an icon. It is the one ornament that is also
  // information — there are three of these and this says which.
  n: { ...type.bodySmall, fontVariant: ["tabular-nums"] },
});

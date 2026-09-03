import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { MemberCard } from "../components/MemberCard";
import { useSession } from "../lib/session";
import { colors, space } from "../theme";

/** What the last ten minutes bought, said as things rather than as a list.
 *
 *  The old copy described the app ("Buy, sell and message other members").
 *  These name what CHANGED — a permission that did not exist an hour ago. The
 *  difference is whether it reads as marketing or as a receipt. */
const OPENS = [
  ["List cards", "With the Seller Verified badge on every one"],
  ["Make offers", "And message the person on the other end"],
  ["Keep your scans", "Saved to a collection that follows you"],
];

export default function Ready() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    // A success tap, once. The screen already looks like something worked;
    // this is the half of it you feel. Lazily required — no haptics on web.
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
        <Animated.View entering={FadeInDown.duration(420).delay(720)}>
          <Button label="Scan your first card" onPress={() => router.replace("/(tabs)/scan")} />
          <Button
            label="Look around first"
            kind="link"
            onPress={() => router.replace("/(tabs)/home")}
          />
        </Animated.View>
      }
    >
      <View style={s.middle}>
        <MemberCard name={session?.name ?? "Collector"} />

        <Animated.View entering={FadeInDown.duration(440).delay(420)} style={s.copy}>
          <Txt variant="display" center>You&rsquo;re In</Txt>
          <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
            Verified, and ready to trade.
          </Txt>
        </Animated.View>

        {/* Hairlines, no tiles. Three coloured squares down the left made
            three sentences look like three buttons, and the colours were
            doing no work — nothing here is sorted or filtered by them. */}
        <View style={s.list}>
          {OPENS.map(([title, body], i) => (
            <Animated.View
              key={title}
              entering={FadeInDown.duration(400).delay(520 + i * 80)}
              style={[s.row, i > 0 && s.divided]}
            >
              <View style={s.tick} />
              <View style={{ flex: 1 }}>
                <Txt variant="button">{title}</Txt>
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
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center", marginTop: space.xxl },
  list: { marginTop: space.xl, alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  // A gold dot, not an icon. It marks the line without pretending to
  // illustrate it, which is all three of these needed.
  tick: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
});

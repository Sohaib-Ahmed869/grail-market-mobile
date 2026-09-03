import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { SuccessSeal } from "../components/SuccessSeal";
import { colors, radius, space } from "../theme";

/** What the last ten minutes bought, said as things rather than as a list.
 *
 *  The old copy described the app ("Buy, sell and message other members").
 *  These name what CHANGED — a permission that did not exist an hour ago. The
 *  difference is whether somebody reads it as marketing or as a receipt. */
const OPENS: { icon: IconName; tone: string; title: string; body: string }[] = [
  {
    icon: "selling", tone: colors.ink,
    title: "You can list cards",
    body: "With the Seller Verified badge on every one",
  },
  {
    icon: "offer", tone: colors.up,
    title: "You can make offers",
    body: "And message the person on the other end",
  },
  {
    icon: "scan", tone: colors.accent,
    title: "Your scans are yours",
    body: "Saved to a collection that follows you",
  },
];

export default function Ready() {
  const router = useRouter();

  useEffect(() => {
    // A success tap, once. The screen already looks like something worked;
    // this is the half of it you feel, and it is the difference between a
    // page and a moment. Lazily required — haptics do not exist on web.
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
        <Animated.View entering={FadeInDown.duration(420).delay(760)}>
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
        <SuccessSeal size={104} />

        <Animated.View entering={FadeInDown.duration(460).delay(420)} style={s.copy}>
          <Txt variant="display" center>You&rsquo;re In</Txt>
          <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
            {/* Short enough not to wrap. The three cards under it already
                say what opened up, so saying it here too left the word "up"
                orphaned on a line of its own. */}
            Verified, and ready to trade.
          </Txt>
        </Animated.View>

        <View style={s.list}>
          {OPENS.map((o, i) => (
            <Animated.View
              key={o.title}
              entering={FadeInDown.duration(420).delay(540 + i * 90)}
              style={s.row}
            >
              <View style={[s.icon, { backgroundColor: o.tone }]}>
                <Icon name={o.icon} size={16} color={colors.onPrimary} filled />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="button">{o.title}</Txt>
                <Txt variant="bodySmall" color={colors.inkMuted}>{o.body}</Txt>
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
  copy: { alignItems: "center", marginTop: space.md },
  list: { marginTop: space.xxl, gap: space.sm, alignSelf: "stretch" },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  icon: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
});

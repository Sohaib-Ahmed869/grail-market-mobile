import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuthShell } from "../components/AuthShell";
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
 *  The same band as sign-in and sign-up, on purpose: this is the last screen
 *  of that flow, and closing it under the mark it opened under makes it one
 *  journey rather than three screens that happen to follow each other.
 *
 *  No illustration inside the sheet. A tick radiating rings, a membership card
 *  and a slab were all tried, and each was a decoration standing in for the
 *  moment rather than being it — the screen ended up about the graphic. The
 *  band is the only ornament, and it is already there.
 */
export default function Ready() {
  const router = useRouter();
  const session = useSession();
  const first = (session?.name ?? "").trim().split(" ")[0] || null;

  useEffect(() => {
    // A success tap, once. This is the half of it you feel, and with nothing
    // on screen doing the celebrating it is carrying more than it was.
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
    <AuthShell
      back={false}
      title={first ? `You\u2019re In, ${first}` : "You\u2019re In"}
      sub="Your ID checked out and your plan is live. Three things opened up."
      footer={
        <>
          <Button label="Scan your first card" onPress={() => router.replace("/(tabs)/scan")} />
          <Button
            label="Look around first"
            kind="link"
            onPress={() => router.replace("/(tabs)/home")}
          />
        </>
      }
    >
      <View style={s.list}>
        {OPENS.map(([title, body], i) => (
          <Animated.View
            key={title}
            entering={FadeInDown.duration(400).delay(260 + i * 90)}
            style={[s.row, i > 0 && s.divided]}
          >
            {/* A number, not a bullet or an icon. It is the one ornament that
                is also information: there are three of these and it says
                which. */}
            <Txt style={s.n} color={colors.inkFaint}>{String(i + 1).padStart(2, "0")}</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{title}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted}>{body}</Txt>
            </View>
          </Animated.View>
        ))}
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingVertical: space.lg },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  n: { ...type.bodySmall, fontVariant: ["tabular-nums"] },
});

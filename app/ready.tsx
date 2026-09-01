import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { colors, space } from "../theme";

const OPENS = [
  "Buy, sell and message other members",
  "Create listings with the Seller Verified badge",
  "Everything price checks already did, free",
];

/** You're in.
 *
 *  Worth its own screen rather than a toast. Someone has just proved their
 *  identity and paid — telling them exactly what that bought is the least the
 *  app owes them, and it is the moment they decide whether it was worth it. */
export default function Ready() {
  const router = useRouter();
  return (
    <Screen footer={<Button label="Start scanning" onPress={() => router.replace("/(tabs)/home")} />}>
      <View style={s.middle}>
        <View style={s.badge}>
          <Feather name="check" size={34} color={colors.up} />
        </View>
        <Txt variant="display" center>You&rsquo;re in</Txt>
        <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          Verified, subscribed, and ready to trade.
        </Txt>

        <View style={s.list}>
          {OPENS.map((o) => (
            <View key={o} style={s.row}>
              <Feather name="check" size={15} color={colors.up} />
              <Txt variant="body" color={colors.inkMuted} style={{ flex: 1 }}>{o}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  badge: {
    width: 76, height: 76, borderRadius: 38, marginBottom: space.xl,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.upWash, borderWidth: 1, borderColor: colors.up,
  },
  list: { marginTop: space.xxl, gap: space.md, alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
});

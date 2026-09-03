import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { PageWash } from "./PageWash";
import { Txt } from "./Text";
import { Button } from "./Button";
import { colors, radius, space } from "../theme";

/** What a guest sees where a member's screen would be.
 *
 *  Browsing needs no account and scanning does — not as a growth tactic but
 *  because a scan costs a paid lookup and a collection has to belong to
 *  somebody. So the gate says which of those it is, rather than "sign in to
 *  continue", and it never pretends the feature is broken.
 *
 *  Centred, because a half-empty screen with everything hugging the top reads
 *  as a page that failed to load. */
export function JoinGate({
  icon, title, why, points,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  why: string;
  points: string[];
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <PageWash />
      <View style={s.middle}>
        <View style={s.badge}>
          <Feather name={icon} size={26} color={colors.ink} />
        </View>
        <Txt variant="h1" center style={{ marginTop: space.lg }}>{title}</Txt>
        <Txt variant="body" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          {why}
        </Txt>

        <View style={s.points}>
          {points.map((p) => (
            <View key={p} style={s.point}>
              <Feather name="check" size={14} color={colors.up} />
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ flex: 1 }}>{p}</Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={s.foot}>
        <Button label="Create an account" onPress={() => router.push("/signup")} />
        <Button label="I already have one" kind="ghost" onPress={() => router.push("/signin")} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  middle: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space.xxl,
  },
  badge: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  points: {
    gap: space.sm, marginTop: space.xl, alignSelf: "stretch",
    padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  point: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  foot: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.sm },
});
